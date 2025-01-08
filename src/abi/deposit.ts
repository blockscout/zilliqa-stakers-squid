import * as p from '@subsquid/evm-codec'
import { event, fun, viewFun, indexed, ContractBase } from '@subsquid/evm-abi'
import type { EventParams as EParams, FunctionArguments, FunctionReturn } from '@subsquid/evm-abi'

export const events = {
    Initialized: event("0xc7f505b2f371ae2175ee4913f4499e1f2633a7b5936321eed1cdaeb6115181d2", "Initialized(uint64)", {"version": p.uint64}),
    StakeChanged: event("0x982c643743b64ff403bb17cd1f20dd6c3bca86325c6ad3d5cddaf08b57b22113", "StakeChanged(bytes,uint256,uint256)", {"blsPubKey": p.bytes, "atFutureBlock": p.uint256, "newStake": p.uint256}),
    StakerAdded: event("0xc758b38fca30d8a2d8b0de67b5fc116c2cdc671f466eda1eaa9dc0543785bd2a", "StakerAdded(bytes,uint256,uint256)", {"blsPubKey": p.bytes, "atFutureBlock": p.uint256, "newStake": p.uint256}),
    StakerRemoved: event("0x76d0906eff21f332e44d50ba0e3eb461a4c398e4e6e12b0b6dfc52c914ad2ca0", "StakerRemoved(bytes,uint256)", {"blsPubKey": p.bytes, "atFutureBlock": p.uint256}),
    StakerUpdated: event("0xde5c2a0bd8463eb96dec5195e1024ecc0302475078998dced1b296bd8ffb2686", "StakerUpdated(bytes)", {"blsPubKey": p.bytes}),
    Upgraded: event("0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b", "Upgraded(address)", {"implementation": indexed(p.address)}),
}

export const functions = {
    UPGRADE_INTERFACE_VERSION: viewFun("0xad3cb1cc", "UPGRADE_INTERFACE_VERSION()", {}, p.string),
    VERSION: viewFun("0xffa1ad74", "VERSION()", {}, p.uint64),
    blocksPerEpoch: viewFun("0xf0682054", "blocksPerEpoch()", {}, p.uint64),
    currentEpoch: viewFun("0x76671808", "currentEpoch()", {}, p.uint64),
    deposit: fun("0x19f44af5", "deposit(bytes,bytes,bytes,address,address)", {"blsPubKey": p.bytes, "peerId": p.bytes, "signature": p.bytes, "rewardAddress": p.address, "signingAddress": p.address}, ),
    depositTopup: fun("0x90948c25", "depositTopup()", {}, ),
    getControlAddress: viewFun("0x584aad1e", "getControlAddress(bytes)", {"blsPubKey": p.bytes}, p.address),
    getFutureStake: viewFun("0x23edbaca", "getFutureStake(bytes)", {"blsPubKey": p.bytes}, p.uint256),
    getFutureTotalStake: viewFun("0xdef54646", "getFutureTotalStake()", {}, p.uint256),
    getPeerId: viewFun("0xf8e7f292", "getPeerId(bytes)", {"blsPubKey": p.bytes}, p.bytes),
    getRewardAddress: viewFun("0xd64345a9", "getRewardAddress(bytes)", {"blsPubKey": p.bytes}, p.address),
    getSigningAddress: viewFun("0x40be3fb1", "getSigningAddress(bytes)", {"blsPubKey": p.bytes}, p.address),
    getStake: viewFun("0x41f09723", "getStake(bytes)", {"blsPubKey": p.bytes}, p.uint256),
    getStakerData: viewFun("0xed88cb39", "getStakerData(bytes)", {"blsPubKey": p.bytes}, {"index": p.uint256, "balance": p.uint256, "staker": p.struct({"controlAddress": p.address, "rewardAddress": p.address, "peerId": p.bytes, "withdrawals": p.struct({"values": p.array(p.struct({"startedAt": p.uint256, "amount": p.uint256})), "head": p.uint256, "len": p.uint256}), "signingAddress": p.address})}),
    getStakers: viewFun("0x43352d61", "getStakers()", {}, p.array(p.bytes)),
    getStakersData: viewFun("0x01a851ce", "getStakersData()", {}, {"stakerKeys": p.array(p.bytes), "indices": p.array(p.uint256), "balances": p.array(p.uint256), "stakers": p.array(p.struct({"controlAddress": p.address, "rewardAddress": p.address, "peerId": p.bytes, "withdrawals": p.struct({"values": p.array(p.struct({"startedAt": p.uint256, "amount": p.uint256})), "head": p.uint256, "len": p.uint256}), "signingAddress": p.address}))}),
    getTotalStake: viewFun("0x7bc74225", "getTotalStake()", {}, p.uint256),
    leaderAtView: viewFun("0x75afde07", "leaderAtView(uint256)", {"viewNumber": p.uint256}, p.bytes),
    maximumStakers: viewFun("0x8bbc9d11", "maximumStakers()", {}, p.uint256),
    minimumStake: viewFun("0xec5ffac2", "minimumStake()", {}, p.uint256),
    nextUpdate: viewFun("0x6e9c11f9", "nextUpdate()", {}, p.uint256),
    proxiableUUID: viewFun("0x52d1902d", "proxiableUUID()", {}, p.bytes32),
    reinitialize: fun("0x6c2eb350", "reinitialize()", {}, ),
    setControlAddress: fun("0x7d31e34c", "setControlAddress(bytes,address)", {"blsPubKey": p.bytes, "controlAddress": p.address}, ),
    setRewardAddress: fun("0x550b0cbb", "setRewardAddress(bytes,address)", {"blsPubKey": p.bytes, "rewardAddress": p.address}, ),
    setSigningAddress: fun("0x8bc0727a", "setSigningAddress(bytes,address)", {"blsPubKey": p.bytes, "signingAddress": p.address}, ),
    unstake: fun("0x2e17de78", "unstake(uint256)", {"amount": p.uint256}, ),
    upgradeToAndCall: fun("0x4f1ef286", "upgradeToAndCall(address,bytes)", {"newImplementation": p.address, "data": p.bytes}, ),
    version: viewFun("0x54fd4d50", "version()", {}, p.uint64),
    'withdraw(uint256)': fun("0x2e1a7d4d", "withdraw(uint256)", {"count": p.uint256}, ),
    'withdraw()': fun("0x3ccfd60b", "withdraw()", {}, ),
    withdrawalPeriod: viewFun("0xbca7093d", "withdrawalPeriod()", {}, p.uint256),
}

export class Contract extends ContractBase {

    UPGRADE_INTERFACE_VERSION() {
        return this.eth_call(functions.UPGRADE_INTERFACE_VERSION, {})
    }

    VERSION() {
        return this.eth_call(functions.VERSION, {})
    }

    blocksPerEpoch() {
        return this.eth_call(functions.blocksPerEpoch, {})
    }

    currentEpoch() {
        return this.eth_call(functions.currentEpoch, {})
    }

    getControlAddress(blsPubKey: GetControlAddressParams["blsPubKey"]) {
        return this.eth_call(functions.getControlAddress, {blsPubKey})
    }

    getFutureStake(blsPubKey: GetFutureStakeParams["blsPubKey"]) {
        return this.eth_call(functions.getFutureStake, {blsPubKey})
    }

    getFutureTotalStake() {
        return this.eth_call(functions.getFutureTotalStake, {})
    }

    getPeerId(blsPubKey: GetPeerIdParams["blsPubKey"]) {
        return this.eth_call(functions.getPeerId, {blsPubKey})
    }

    getRewardAddress(blsPubKey: GetRewardAddressParams["blsPubKey"]) {
        return this.eth_call(functions.getRewardAddress, {blsPubKey})
    }

    getSigningAddress(blsPubKey: GetSigningAddressParams["blsPubKey"]) {
        return this.eth_call(functions.getSigningAddress, {blsPubKey})
    }

    getStake(blsPubKey: GetStakeParams["blsPubKey"]) {
        return this.eth_call(functions.getStake, {blsPubKey})
    }

    getStakerData(blsPubKey: GetStakerDataParams["blsPubKey"]) {
        return this.eth_call(functions.getStakerData, {blsPubKey})
    }

    getStakers() {
        return this.eth_call(functions.getStakers, {})
    }

    getStakersData() {
        return this.eth_call(functions.getStakersData, {})
    }

    getTotalStake() {
        return this.eth_call(functions.getTotalStake, {})
    }

    leaderAtView(viewNumber: LeaderAtViewParams["viewNumber"]) {
        return this.eth_call(functions.leaderAtView, {viewNumber})
    }

    maximumStakers() {
        return this.eth_call(functions.maximumStakers, {})
    }

    minimumStake() {
        return this.eth_call(functions.minimumStake, {})
    }

    nextUpdate() {
        return this.eth_call(functions.nextUpdate, {})
    }

    proxiableUUID() {
        return this.eth_call(functions.proxiableUUID, {})
    }

    version() {
        return this.eth_call(functions.version, {})
    }

    withdrawalPeriod() {
        return this.eth_call(functions.withdrawalPeriod, {})
    }
}

/// Event types
export type InitializedEventArgs = EParams<typeof events.Initialized>
export type StakeChangedEventArgs = EParams<typeof events.StakeChanged>
export type StakerAddedEventArgs = EParams<typeof events.StakerAdded>
export type StakerRemovedEventArgs = EParams<typeof events.StakerRemoved>
export type StakerUpdatedEventArgs = EParams<typeof events.StakerUpdated>
export type UpgradedEventArgs = EParams<typeof events.Upgraded>

/// Function types
export type UPGRADE_INTERFACE_VERSIONParams = FunctionArguments<typeof functions.UPGRADE_INTERFACE_VERSION>
export type UPGRADE_INTERFACE_VERSIONReturn = FunctionReturn<typeof functions.UPGRADE_INTERFACE_VERSION>

export type VERSIONParams = FunctionArguments<typeof functions.VERSION>
export type VERSIONReturn = FunctionReturn<typeof functions.VERSION>

export type BlocksPerEpochParams = FunctionArguments<typeof functions.blocksPerEpoch>
export type BlocksPerEpochReturn = FunctionReturn<typeof functions.blocksPerEpoch>

export type CurrentEpochParams = FunctionArguments<typeof functions.currentEpoch>
export type CurrentEpochReturn = FunctionReturn<typeof functions.currentEpoch>

export type DepositParams = FunctionArguments<typeof functions.deposit>
export type DepositReturn = FunctionReturn<typeof functions.deposit>

export type DepositTopupParams = FunctionArguments<typeof functions.depositTopup>
export type DepositTopupReturn = FunctionReturn<typeof functions.depositTopup>

export type GetControlAddressParams = FunctionArguments<typeof functions.getControlAddress>
export type GetControlAddressReturn = FunctionReturn<typeof functions.getControlAddress>

export type GetFutureStakeParams = FunctionArguments<typeof functions.getFutureStake>
export type GetFutureStakeReturn = FunctionReturn<typeof functions.getFutureStake>

export type GetFutureTotalStakeParams = FunctionArguments<typeof functions.getFutureTotalStake>
export type GetFutureTotalStakeReturn = FunctionReturn<typeof functions.getFutureTotalStake>

export type GetPeerIdParams = FunctionArguments<typeof functions.getPeerId>
export type GetPeerIdReturn = FunctionReturn<typeof functions.getPeerId>

export type GetRewardAddressParams = FunctionArguments<typeof functions.getRewardAddress>
export type GetRewardAddressReturn = FunctionReturn<typeof functions.getRewardAddress>

export type GetSigningAddressParams = FunctionArguments<typeof functions.getSigningAddress>
export type GetSigningAddressReturn = FunctionReturn<typeof functions.getSigningAddress>

export type GetStakeParams = FunctionArguments<typeof functions.getStake>
export type GetStakeReturn = FunctionReturn<typeof functions.getStake>

export type GetStakerDataParams = FunctionArguments<typeof functions.getStakerData>
export type GetStakerDataReturn = FunctionReturn<typeof functions.getStakerData>

export type GetStakersParams = FunctionArguments<typeof functions.getStakers>
export type GetStakersReturn = FunctionReturn<typeof functions.getStakers>

export type GetStakersDataParams = FunctionArguments<typeof functions.getStakersData>
export type GetStakersDataReturn = FunctionReturn<typeof functions.getStakersData>

export type GetTotalStakeParams = FunctionArguments<typeof functions.getTotalStake>
export type GetTotalStakeReturn = FunctionReturn<typeof functions.getTotalStake>

export type LeaderAtViewParams = FunctionArguments<typeof functions.leaderAtView>
export type LeaderAtViewReturn = FunctionReturn<typeof functions.leaderAtView>

export type MaximumStakersParams = FunctionArguments<typeof functions.maximumStakers>
export type MaximumStakersReturn = FunctionReturn<typeof functions.maximumStakers>

export type MinimumStakeParams = FunctionArguments<typeof functions.minimumStake>
export type MinimumStakeReturn = FunctionReturn<typeof functions.minimumStake>

export type NextUpdateParams = FunctionArguments<typeof functions.nextUpdate>
export type NextUpdateReturn = FunctionReturn<typeof functions.nextUpdate>

export type ProxiableUUIDParams = FunctionArguments<typeof functions.proxiableUUID>
export type ProxiableUUIDReturn = FunctionReturn<typeof functions.proxiableUUID>

export type ReinitializeParams = FunctionArguments<typeof functions.reinitialize>
export type ReinitializeReturn = FunctionReturn<typeof functions.reinitialize>

export type SetControlAddressParams = FunctionArguments<typeof functions.setControlAddress>
export type SetControlAddressReturn = FunctionReturn<typeof functions.setControlAddress>

export type SetRewardAddressParams = FunctionArguments<typeof functions.setRewardAddress>
export type SetRewardAddressReturn = FunctionReturn<typeof functions.setRewardAddress>

export type SetSigningAddressParams = FunctionArguments<typeof functions.setSigningAddress>
export type SetSigningAddressReturn = FunctionReturn<typeof functions.setSigningAddress>

export type UnstakeParams = FunctionArguments<typeof functions.unstake>
export type UnstakeReturn = FunctionReturn<typeof functions.unstake>

export type UpgradeToAndCallParams = FunctionArguments<typeof functions.upgradeToAndCall>
export type UpgradeToAndCallReturn = FunctionReturn<typeof functions.upgradeToAndCall>

export type VersionParams = FunctionArguments<typeof functions.version>
export type VersionReturn = FunctionReturn<typeof functions.version>

export type WithdrawParams_0 = FunctionArguments<typeof functions['withdraw(uint256)']>
export type WithdrawReturn_0 = FunctionReturn<typeof functions['withdraw(uint256)']>

export type WithdrawParams_1 = FunctionArguments<typeof functions['withdraw()']>
export type WithdrawReturn_1 = FunctionReturn<typeof functions['withdraw()']>

export type WithdrawalPeriodParams = FunctionArguments<typeof functions.withdrawalPeriod>
export type WithdrawalPeriodReturn = FunctionReturn<typeof functions.withdrawalPeriod>

