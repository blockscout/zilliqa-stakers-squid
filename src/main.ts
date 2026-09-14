import { DataHandlerContext, EvmBatchProcessor } from '@subsquid/evm-processor'
import { Store, TypeormDatabase } from '@subsquid/typeorm-store'
import * as depositAbi from './abi/deposit'
import { Staker } from './model'
import { IsNull } from 'typeorm';


const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const ETH_RPC_URL = process.env.ETH_RPC_URL;
const ETH_RPC_BLOCKS_BATCH_SIZE = Number(process.env.ETH_RPC_BLOCKS_BATCH_SIZE) || 100
const FROM_BLOCK_NUMBER = Number(process.env.FROM_BLOCK_NUMBER) || 0

// Stored in `Staker.index` for a staker that is no longer part of the committee.
// The contract reports a 1-based index and 0 for "not present", so this is
// what `Number(index) - 1` produces for a removed staker.
const REMOVED_INDEX = -1


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
// Block number -> ids of stakers whose committee data must be re-read from the
// contract once that block is reached. Only ids are kept: the staker row is
// loaded fresh at fetch time, so a snapshot taken earlier can never overwrite
// updates (e.g. a zeroed balance) that were applied in the meantime.
const stakersToFetchAtBlockNumber = new Map<number, Set<string>>();

function scheduleFetch(blockNumber: number, stakerId: string) {
    if (!stakersToFetchAtBlockNumber.has(blockNumber)) {
        stakersToFetchAtBlockNumber.set(blockNumber, new Set())
    }
    stakersToFetchAtBlockNumber.get(blockNumber)!.add(stakerId)
}

processor.run(db, async ctx => {
    const keyToStaker = new Map<string, Staker>();

    // Returns the in-batch copy of a staker if it has been touched already,
    // otherwise loads it from the database.
    async function getStaker(id: string): Promise<Staker> {
        let staker = keyToStaker.get(id)
        if (staker === undefined) {
            staker = await ctx.store.findOneByOrFail(Staker, { id })
        }
        return staker
    }

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

    // After a restart or a reorg, re-schedule the fetch for stakers whose
    // committee data has not been retrieved yet.
    if (lastProcessedBlockNumber >= ctx.blocks[0].header.height) {
        let pendingStakers = await ctx.store.find(Staker, { where: { index: IsNull() } })
        for (let staker of pendingStakers) {
            scheduleFetch(staker.stakeUpdatedAtBlockNumber, staker.id)
        }
    }

    for (let block of ctx.blocks) {
        // Process every fetch that is due, not only the one scheduled for
        // exactly this height: the batch only contains blocks with matching
        // logs, so the scheduled block itself may never show up.
        let dueBlockNumbers = Array.from(stakersToFetchAtBlockNumber.keys())
            .filter(blockNumber => blockNumber <= block.header.height)
            .sort((a, b) => a - b)
        if (dueBlockNumbers.length > 0) {
            let contract = new depositAbi.Contract(ctx, block.header, CONTRACT_ADDRESS)
            for (let blockNumber of dueBlockNumbers) {
                for (let stakerId of stakersToFetchAtBlockNumber.get(blockNumber)!) {
                    let staker = await getStaker(stakerId)
                    let { index, stakerData } = await contract.getStakerData(staker.id)
                    ctx.log.info(`Retrieved staker data: ${index} ${stakerData.peerId} ${stakerData.controlAddress} ${stakerData.rewardAddress} ${stakerData.signingAddress}`)
                    staker.index = Number(index) - 1
                    if (staker.index === REMOVED_INDEX) {
                        // Not part of the committee anymore: it cannot hold any stake.
                        staker.balance = BigInt(0)
                    }
                    staker.peerId = hexToBytes(stakerData.peerId)
                    staker.controlAddressHash = hexToBytes(stakerData.controlAddress)
                    staker.rewardAddressHash = hexToBytes(stakerData.rewardAddress)
                    staker.signingAddressHash = hexToBytes(stakerData.signingAddress)
                    staker.updatedAt = new Date()
                    keyToStaker.set(staker.id, staker)
                }
                stakersToFetchAtBlockNumber.delete(blockNumber)
            }
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
                        scheduleFetch(staker.stakeUpdatedAtBlockNumber, staker.id)
                    }
                    break
                case depositAbi.events.StakerRemoved.topic:
                    {
                        let { blsPubKey, atFutureBlock } = depositAbi.events.StakerRemoved.decode(log)
                        ctx.log.info(`StakerRemoved: ${blsPubKey} ${atFutureBlock}`)
                        let staker = await getStaker(blsPubKey)
                        staker.stakeUpdatedAtBlockNumber = Number(atFutureBlock)
                        staker.balance = BigInt(0)
                        staker.index = REMOVED_INDEX
                        staker.updatedAt = new Date()
                        keyToStaker.set(staker.id, staker)
                    }
                    break
                case depositAbi.events.StakeChanged.topic:
                    {
                        let { blsPubKey, atFutureBlock, newStake } = depositAbi.events.StakeChanged.decode(log)
                        ctx.log.info(`StakeChanged: ${blsPubKey} ${atFutureBlock} ${newStake}`)
                        let staker = await getStaker(blsPubKey)
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
                        let staker = await getStaker(blsPubKey)
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
                        let staker = await getStaker(blsPubKey)
                        // Unlike the indices returned by `getStakerData`/`getStakersData`,
                        // `newPosition` is already the 0-based position in `stakerKeys`.
                        staker.index = Number(newPosition)
                        staker.updatedAt = new Date()
                        keyToStaker.set(staker.id, staker)
                    }
                    break
                default:
                    break
            }
        }
    }
    await saveStakers(ctx, keyToStaker)
    lastProcessedBlockNumber = ctx.blocks[ctx.blocks.length - 1].header.height
})

async function saveStakers(ctx: DataHandlerContext<Store, {}>, keyToStaker: Map<string, Staker>) {
    let stakers = Array.from(keyToStaker.values())
    await ctx.store.upsert(stakers)
    keyToStaker.clear()
}
