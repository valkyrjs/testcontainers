/**
 * @module
 *
 * Provides the ability to quickly run a postgres image in a docker instance.
 *
 * @example
 * ```ts
 * import { PostgresTestContainer } from "@valkyr/testcontainers/postgres";
 *
 * const container = await PostgresTestContainer.start("postgres:16");
 *
 * await container.create("db");
 * await container.client("db")`SELECT 1`;
 *
 * console.log(container.url("db")); // => postgres://postgres:postgres@127.0.0.1:5432/db
 *
 * await container.stop();
 * ```
 */

import delay from "delay";
import getPort from "port";
import psql, { type Sql } from "postgres";

import type { Container } from "../docker/libraries/container.ts";
import { docker } from "../mod.ts";

export class PostgresTestContainer {
  private constructor(
    readonly container: Container,
    readonly port: number,
    readonly config: Config,
  ) {}

  /*
   |--------------------------------------------------------------------------------
   | Accessors
   |--------------------------------------------------------------------------------
   */

  /**
   * Connection info for the Postgres container.
   */
  get connectionInfo(): PostgresConnectionInfo {
    return {
      host: "127.0.0.1",
      port: this.port,
      user: this.config.username,
      pass: this.config.password,
    };
  }

  /**
   * Execute a command in the Postgres container.
   */
  get exec(): typeof this.container.exec {
    return this.container.exec.bind(this.container);
  }

  /*
   |--------------------------------------------------------------------------------
   | Lifecycle
   |--------------------------------------------------------------------------------
   */

  /**
   * Start a new Postgres container.
   *
   * @param config - Options for the Postgres container.
   */
  static async start(image: string, config: Partial<Config> = {}): Promise<PostgresTestContainer> {
    const port = getPort();
    if (port === undefined) {
      throw new Error("Unable to assign to a random port");
    }

    await docker.pullImage(image);

    const container = await docker.createContainer({
      Image: image,
      Env: [`POSTGRES_USER=${config.username ?? "postgres"}`, `POSTGRES_PASSWORD=${config.password ?? "postgres"}`],
      ExposedPorts: {
        "5432/tcp": {},
      },
      HostConfig: {
        PortBindings: { "5432/tcp": [{ HostIp: "0.0.0.0", HostPort: String(port) }] },
      },
    });

    await container.start();
    await container.waitForLog("database system is ready");

    await delay(250);

    return new PostgresTestContainer(container, port, {
      username: config.username ?? "postgres",
      password: config.password ?? "postgres",
    });
  }

  /**
   * Stop and remove the Postgres container.
   */
  async stop(): Promise<void> {
    await this.container.remove({ force: true });
  }

  /*
   |--------------------------------------------------------------------------------
   | Utilities
   |--------------------------------------------------------------------------------
   */

  /**
   * Create a new database with the given name.
   *
   * @param name - Name of the database to create.
   */
  async create(name: string): Promise<void> {
    await this.exec(["createdb", `--username=${this.config.username}`, name]);
  }

  /**
   * Get postgres client instance for the current container.
   *
   * @param name    - Database name to connect to.
   * @param options - Connection options to append to the URL.
   */
  client(name: string, options?: PostgresConnectionOptions): Sql {
    return psql(this.url(name, options));
  }

  /**
   * Return the connection URL for the Postgres container in the format:
   * `postgres://${user}:${pass}@${host}:${port}/${database}`.
   *
   * Make sure to start the container before accessing this method or it will
   * throw an error.
   *
   * @param name    - Name of the database to connect to.
   * @param options - Connection options to append to the URL.
   */
  url(name: string, options?: PostgresConnectionOptions): string {
    return getConnectionUrl({ ...this.connectionInfo, name, options });
  }
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

function getConnectionUrl(
  { host, port, user, pass, name, options }: ConnectionUrlConfig,
): PostgresConnectionUrl {
  return `postgres://${user}:${pass}@${host}:${port}/${name}${postgresOptionsToString(options)}`;
}

function postgresOptionsToString(options?: PostgresConnectionOptions) {
  if (options === undefined) {
    return "";
  }
  const values: string[] = [];
  for (const key in options) {
    assertPostgresOptionKey(key);
    values.push(`${key}=${options[key]}`);
  }
  return `?${values.join("&")}`;
}

function assertPostgresOptionKey(key: string): asserts key is keyof PostgresConnectionOptions {
  if (["schema"].includes(key) === false) {
    throw new Error(`Invalid postgres option key: ${key}`);
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type Config = {
  username: string;
  password: string;
};

type PostgresConnectionUrl = `postgres://${string}:${string}@${string}:${number}/${string}`;

type ConnectionUrlConfig = {
  name: string;
  options?: PostgresConnectionOptions;
} & PostgresConnectionInfo;

type PostgresConnectionOptions = {
  schema?: string;
};

type PostgresConnectionInfo = {
  user: string;
  pass: string;
  host: string;
  port: number;
};
