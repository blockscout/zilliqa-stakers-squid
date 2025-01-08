import { Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, IntColumn as IntColumn_, BigIntColumn as BigIntColumn_, BytesColumn as BytesColumn_, DateTimeColumn as DateTimeColumn_ } from "@subsquid/typeorm-store"

@Entity_({ name: "zilliqa_stakers", schema: "public" })
export class Staker {
    constructor(props?: Partial<Staker>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @IntColumn_({ nullable: true })
    index!: number | undefined | null

    @BigIntColumn_({ nullable: false })
    balance!: bigint

    @BytesColumn_({ nullable: true })
    peerId!: Uint8Array | undefined | null

    @BytesColumn_({ nullable: true })
    controlAddressHash!: Uint8Array | undefined | null

    @BytesColumn_({ nullable: true })
    rewardAddressHash!: Uint8Array | undefined | null

    @BytesColumn_({ nullable: true })
    signingAddressHash!: Uint8Array | undefined | null

    @IntColumn_({ nullable: false })
    addedAtBlockNumber!: number

    @IntColumn_({ nullable: false })
    stakeUpdatedAtBlockNumber!: number

    @DateTimeColumn_({ nullable: false })
    insertedAt!: Date

    @DateTimeColumn_({ nullable: false })
    updatedAt!: Date
}
