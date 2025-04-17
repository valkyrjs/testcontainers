<p align="center">
  <img src="https://user-images.githubusercontent.com/1998130/229430454-ca0f2811-d874-4314-b13d-c558de8eec7e.svg" />
</p>

# Test Containers

Test container solution for running third party solutions through docker.

## Quick Start

We have quick start support for `postgres` and `mongodb`.

### Postgres

```ts
import { PostgresTestContainer } from "@valkyr/testcontainers/postgres";

const container = await PostgresTestContainer.start("postgres:16");

await container.create("db");
await container.client("db")`SELECT 1`;

console.log(container.url("db")); // => postgres://postgres:postgres@127.0.0.1:5432/db

await container.stop();
```

### MongoDB

```ts
import { MongoTestContainer } from "@valkyr/testcontainers/mongodb";

const container = await MongoTestContainer.start();

console.log(container.url()); // mongodb://user:pass@127.0.0.1:27017
console.log(await container.client.db("admin").command({ ping: 1 })) // { ok: 1 }

await container.stop();
```
