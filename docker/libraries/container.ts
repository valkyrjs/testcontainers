import { CreateExecOptions, Exec } from "./exec.ts";
import { modem } from "./modem.ts";

export class Container {
  /**
   * Instantiate a docker container.
   *
   * @param id       - The container ID.
   * @param warnings - Warnings encountered during the container creation.
   */
  constructor(
    readonly id: string,
    readonly warnings: string[],
  ) {}

  /**
   * Start the container.
   *
   * @see https://docs.docker.com/engine/api/v1.45/#tag/Container/operation/ContainerStart
   *
   * @param query.signal - Signal to send to the container as an integer or string (e.g. SIGINT).
   * @param query.t      - An integer representing the number of seconds to wait before killing the container.
   */
  async start(query: SignalQuery = {}) {
    await modem.post({ path: `/containers/${this.id}/start`, query });
  }

  /**
   * Stop the container.
   *
   * @see https://docs.docker.com/engine/api/v1.45/#tag/Container/operation/ContainerStop
   *
   * @param query.signal - Signal to send to the container as an integer or string (e.g. SIGINT).
   * @param query.t      - An integer representing the number of seconds to wait before killing the container.
   */
  async stop(query: SignalQuery = {}) {
    await modem.post({ path: `/containers/${this.id}/stop`, query });
  }

  /**
   * Remove the container.
   *
   * @see https://docs.docker.com/engine/api/v1.45/#tag/Container/operation/ContainerDelete
   *
   * @param query.v     - Remove the volumes associated with the container.
   * @param query.force - Kill the container if it is running.
   * @param query.link  - Remove the specified link and not the underlying container.
   */
  async remove(query: { v?: boolean; force?: boolean; link?: boolean } = {}) {
    await modem.del({ path: `/containers/${this.id}`, query });
  }

  /**
   * Return low-level information about a container.
   *
   * @see https://docs.docker.com/engine/api/v1.45/#tag/Container/operation/ContainerInspect
   */
  async inspect() {
    return modem.get({ path: `/containers/${this.id}/json` });
  }

  /**
   * Get the logs of the container.
   *
   * @see https://docs.docker.com/engine/api/v1.45/#tag/Container/operation/ContainerLogs
   *
   * @param handler - Function to handle each line of the logs.
   */
  async logs(handler: (line: string) => true | void) {
    const res = await modem.request({
      method: "GET",
      path: `/containers/${this.id}/logs`,
      query: {
        stdout: true,
        follow: true,
        tail: "all",
      },
    });
    for await (const chunk of res.stream) {
      if (handler(chunk) === true) {
        break;
      }
    }
  }

  /**
   * Run a command inside the running container.
   *
   * @see https://docs.docker.com/engine/api/v1.45/#tag/Exec/operation/ContainerExec
   *
   * @param cmd  - Command to run.
   * @param opts - Options for the command.
   */
  async exec(cmd: string | string[], opts: Partial<CreateExecOptions> = {}) {
    const { Id } = await modem.post<{ Id: string }>({
      path: `/containers/${this.id}/exec`,
      body: {
        ...opts,
        Cmd: Array.isArray(cmd) ? cmd : [cmd],
        AttachStdout: true,
        AttachStderr: true,
      },
    });
    return new Exec(Id).start();
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type SignalQuery = {
  /**
   * Signal to send to the container as an integer or string (e.g. SIGINT).
   */
  signal?: string;

  /**
   * An integer representing the number of seconds to wait before killing the container.
   */
  t?: number;
};
