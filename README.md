# Zilliqa Stakers Squid

An indexer for Zilliqa Stakers built with [Subsquid SDK][subsquid-sdk]. This
indexer specifically targets the [`Deposit` contract][deposit-contract].

## Environment Variables

| Environment Variable         | Description                                   |
|------------------------------|-----------------------------------------------|
| `ETH_RPC_URL`                | URL of the Zilliqa JSON RPC endpoint          |
| `ETH_RPC_BLOCKS_BATCH_SIZE`  | Number of blocks to fetch in each batch       |
| `CONTRACT_ADDRESS`           | Address of the target contract                |
| `FROM_BLOCK_NUMBER`          | Block number to start indexing from           |
| `DB_URL`                     | URL of the PostgreSQL database                |

## Running with Docker

1. **Create a `.env` file**: Include the required environment variables as
   mentioned [above](#environment-variables). For the prototestnet, an example
   `.env` file looks like this:

    ```env
    ETH_RPC_URL=https://api.zq2-prototestnet.zilliqa.com 
    ETH_RPC_BLOCKS_BATCH_SIZE=10000
    CONTRACT_ADDRESS=0x00000000005A494C4445504F53495450524F5859
    FROM_BLOCK_NUMBER=7522968
    DB_URL=postgresql://postgres:postgres@localhost:5432/zilliqa
    ```

1. **Expose Prometheus Metrics (Optional)**: To enable Prometheus metrics, set
   the `PROMETHEUS_PORT` environment variable in the `.env` file. Metrics will
   be accessible at `http://localhost:<PROMETHEUS_PORT>/metrics` within the
   container.

    ```env
    PROMETHEUS_PORT=3000
    ```

1. **Run the Docker container**: 

    ```bash
    docker run --env-file .env ghcr.io/blockscout/zilliqa-stakers-squid:0.1.0
    ```

    **Note:** Replace `0.1.0` with the desired version tag.

---

## Development

### Setup

For development setup, refer to the [development environment setup
guide][development-environment-set-up].

If you use the **Nix package manager**, the provided `flake.nix` can simplify
the setup. Using **direnv** will automatically configure your environment.

### GraphQL Schema Updates

If you modify the `graphql.schema`, you need to regenerate the
[TypeORM](https://github.com/typeorm/typeorm/tree/master) classes:

```bash
npx squid-typeorm-codegen
```

**Note:** The schema must comply with the `zilliqa_stakers` schema defined in
the Blockscout backend. See the `Explorer.Chain.Zilliqa.Staker` module and the
corresponding migrations in `apps/explorer/priv/zilliqa/migrations`[^1].

### Running Locally

1. **Create a `.env` file**: Include the required environment variables as
   mentioned [above](#environment-variables).

2. **Compile the application**:

    ```bash
    npx tsc
    ```

3. **Run the indexer**:

    ```bash
    node -r dotenv/config lib/main.js
    ```

[^1]: Refer to the `Explorer.Chain.Zilliqa.Staker` module and corresponding
    migrations in `apps/explorer/priv/zilliqa/migrations`.

[subsquid-sdk]: https://github.com/subsquid/squid-sdk
[development-environment-set-up]:
    https://docs.sqd.dev/sdk/how-to-start/development-environment-set-up/
[deposit-contract]:
    https://github.com/Zilliqa/zq2/blob/main/zilliqa/src/contracts/deposit_v3.sol
