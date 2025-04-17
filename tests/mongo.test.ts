import { assertEquals } from "@std/assert";
import { afterAll, describe, it } from "@std/testing/bdd";

import { MongoTestContainer } from "../containers/mongodb.ts";

const container = await MongoTestContainer.start();

describe("Mongo", () => {
  afterAll(async () => {
    await container.stop();
  });

  it("should spin up a mongodb container", async () => {
    const res = await container.client.db("admin").command({ ping: 1 });
    assertEquals(res.ok, 1);
  });
});
