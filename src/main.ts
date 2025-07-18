import { DataHandlerContext, EvmBatchProcessor } from '@subsquid/evm-processor'
import { Store, TypeormDatabase } from '@subsquid/typeorm-store'
import * as depositAbi from './abi/deposit'
import { Staker } from './model'
import { MoreThan } from 'typeorm';


const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const ETH_RPC_URL = process.env.ETH_RPC_URL;
const ETH_RPC_BLOCKS_BATCH_SIZE = Number(process.env.ETH_RPC_BLOCKS_BATCH_SIZE) || 100
const FROM_BLOCK_NUMBER = Number(process.env.FROM_BLOCK_NUMBER) || 0


const processor = new EvmBatchProcessor()
    .setRpcEndpoint({
        url: ETH_RPC_URL,
        rateLimit: ETH_RPC_BLOCKS_BATCH_SIZE
    })
    .setFinalityConfirmation(2) // 15 mins to finality
    .addLog({ address: [CONTRACT_ADDRESS] })
    .setBlockRange({ from: FROM_BLOCK_NUMBER })

const db = new TypeormDatabase()

function hexToBytes(address: string): Uint8Array {
    const cleaned = address.toLowerCase().replace('0x', '')
    return Buffer.from(cleaned, 'hex')
}

let lastProcessedBlockNumber = Number.MAX_VALUE;
const stakersToFetchAtBlockNumber = new Map<number, Staker[]>();

processor.run(db, async ctx => {
    const keyToStaker = new Map<String, Staker>();

    // Fetch initial data only for FROM_BLOCK_NUMBER if not already done
    if (ctx.blocks[0].header.height === FROM_BLOCK_NUMBER) {
        ctx.log.info(`Fetching initial stakers data at block ${FROM_BLOCK_NUMBER}...`);
        let contract = new depositAbi.Contract(ctx, ctx.blocks[0].header, CONTRACT_ADDRESS);

        try {
            let { stakerKeys, indices, balances, stakers } = await contract.getStakersData();
            ctx.log.info(`Found ${stakerKeys.length} initial stakers`);

            for (let i = 0; i < stakerKeys.length; i++) {
                let staker = new Staker({
                    id: stakerKeys[i],
                    addedAtBlockNumber: FROM_BLOCK_NUMBER,
                    stakeUpdatedAtBlockNumber: FROM_BLOCK_NUMBER,
                    balance: balances[i],
                    index: Number(indices[i]) - 1,
                    peerId: hexToBytes(stakers[i].peerId),
                    controlAddressHash: hexToBytes(stakers[i].controlAddress),
                    rewardAddressHash: hexToBytes(stakers[i].rewardAddress),
                    signingAddressHash: hexToBytes(stakers[i].signingAddress),
                    insertedAt: new Date(),
                    updatedAt: new Date()
                });
                keyToStaker.set(staker.id, staker);
                ctx.log.info(`Initial staker: ${staker.id} with index ${staker.index} and balance ${staker.balance}`);
            }
        } catch (error) {
            ctx.log.error({ error }, 'Failed to fetch initial stakers data');
        }
    }

    // If reorg happened, we need to update stakers pending to fetch
    if (lastProcessedBlockNumber >= ctx.blocks[0].header.height) {
        await ctx.store.find(Staker, { where: { index: null } }).then(
            (stakersFromDb) => {
                for (let staker of stakersFromDb) {
                    const blockNumber = staker.stakeUpdatedAtBlockNumber
                    if (!stakersToFetchAtBlockNumber.has(blockNumber)) {
                        stakersToFetchAtBlockNumber.set(blockNumber, [])
                    }
                    stakersToFetchAtBlockNumber.get(blockNumber)!.push(staker)
                }
            }
        )
    }

    for (let block of ctx.blocks) {
        if (stakersToFetchAtBlockNumber.has(block.header.height)) {
            let contract = new depositAbi.Contract(ctx, block.header, CONTRACT_ADDRESS)
            for (let staker of stakersToFetchAtBlockNumber.get(block.header.height)) {
                let { index, stakerData } = await contract.getStakerData(staker.id)
                ctx.log.info(`Retrieved staker data: ${index} ${stakerData.peerId} ${stakerData.controlAddress} ${stakerData.rewardAddress} ${stakerData.signingAddress}`)
                staker.index = Number(index) - 1
                staker.peerId = hexToBytes(stakerData.peerId)
                staker.controlAddressHash = hexToBytes(stakerData.controlAddress)
                staker.rewardAddressHash = hexToBytes(stakerData.rewardAddress)
                staker.signingAddressHash = hexToBytes(stakerData.signingAddress)
                staker.updatedAt = new Date()
                keyToStaker.set(staker.id, staker)
            }
            stakersToFetchAtBlockNumber.delete(block.header.height)
        }

        for (let log of block.logs) {
            switch (log.topics[0]) {
                case depositAbi.events.StakerAdded.topic:
                    {
                        let { blsPubKey, atFutureBlock, newStake } = depositAbi.events.StakerAdded.decode(log)
                        ctx.log.info(`StakerAdded: ${blsPubKey} ${atFutureBlock} ${newStake}`)
                        let staker = new Staker({
                            id: blsPubKey,
                            addedAtBlockNumber: Number(atFutureBlock),
                            stakeUpdatedAtBlockNumber: Number(atFutureBlock),
                            balance: newStake,
                            insertedAt: new Date(),
                            updatedAt: new Date()
                        })
                        keyToStaker.set(staker.id, staker)
                        if (stakersToFetchAtBlockNumber.has(staker.stakeUpdatedAtBlockNumber)) {
                            stakersToFetchAtBlockNumber.get(staker.stakeUpdatedAtBlockNumber).push(staker)
                        } else {
                            stakersToFetchAtBlockNumber.set(staker.stakeUpdatedAtBlockNumber, [staker])
                        }
                    }
                    break
                case depositAbi.events.StakerRemoved.topic:
                    {
                        saveStakers(ctx, keyToStaker)
                        let { blsPubKey, atFutureBlock } = depositAbi.events.StakerRemoved.decode(log)
                        ctx.log.info(`StakerRemoved: ${blsPubKey} ${atFutureBlock}`)
                        let staker = await ctx.store.findOneByOrFail(Staker, { id: blsPubKey })
                        staker.stakeUpdatedAtBlockNumber = Number(atFutureBlock)
                        staker.balance = BigInt(0)
                        staker.updatedAt = new Date()
                        keyToStaker.set(staker.id, staker)
                    }
                    break
                case depositAbi.events.StakeChanged.topic:
                    {
                        saveStakers(ctx, keyToStaker)
                        let { blsPubKey, atFutureBlock, newStake } = depositAbi.events.StakeChanged.decode(log)
                        ctx.log.info(`StakeChanged: ${blsPubKey} ${atFutureBlock} ${newStake}`)
                        let staker = await ctx.store.findOneByOrFail(Staker, { id: blsPubKey })
                        staker.stakeUpdatedAtBlockNumber = Number(atFutureBlock)
                        staker.balance = newStake
                        staker.updatedAt = new Date()
                        keyToStaker.set(staker.id, staker)
                    }
                    break
                case depositAbi.events.StakerUpdated.topic:
                    {
                        let { blsPubKey } = depositAbi.events.StakerUpdated.decode(log)
                        ctx.log.info(`StakerUpdated: ${blsPubKey}`)
                        let staker = await ctx.store.findOneByOrFail(Staker, { id: blsPubKey })
                        let contract = new depositAbi.Contract(ctx, block.header, CONTRACT_ADDRESS)
                        let { index, stakerData } = await contract.getStakerData(staker.id)
                        ctx.log.info(`Retrieved staker data: ${index} ${stakerData.peerId} ${stakerData.controlAddress} ${stakerData.rewardAddress} ${stakerData.signingAddress}`)
                        staker.index = Number(index) - 1
                        staker.peerId = hexToBytes(stakerData.peerId)
                        staker.controlAddressHash = hexToBytes(stakerData.controlAddress)
                        staker.rewardAddressHash = hexToBytes(stakerData.rewardAddress)
                        staker.signingAddressHash = hexToBytes(stakerData.signingAddress)
                        staker.updatedAt = new Date()
                        keyToStaker.set(staker.id, staker)
                    }
                    break
                case depositAbi.events.StakerMoved.topic:
                    {
                        let { blsPubKey, newPosition, atFutureBlock } = depositAbi.events.StakerMoved.decode(log)
                        ctx.log.info(`StakerMoved: ${blsPubKey} to position ${newPosition} at block ${atFutureBlock}`)
                        let staker = await ctx.store.findOneByOrFail(Staker, { id: blsPubKey })
                        staker.index = Number(newPosition) - 1
                        keyToStaker.set(staker.id, staker)
                    }
                    break
                default:
                    break
            }
        }
    }
    saveStakers(ctx, keyToStaker)
    lastProcessedBlockNumber = ctx.blocks[ctx.blocks.length - 1].header.height
})

async function saveStakers(ctx: DataHandlerContext<Store, {}>, keyToStaker: Map<String, Staker>) {
    let stakers = Array.from(keyToStaker.values())
    await ctx.store.upsert(stakers)
    keyToStaker.clear()
}
