export const MIN_PORT = 1024;
export const MAX_PORT = 65535;

/**
 * Try run listener to check if port is open.
 *
 * @param options
 */
export function checkPort(options: Deno.ListenOptions): CheckedPort {
  const { port } = options;
  try {
    Deno.listen(options).close();
    return { valid: true, port: port };
  } catch (e) {
    if (e.name !== "AddrInUse") {
      throw e;
    }
    return { valid: false, port: port };
  }
}

/**
 * Create an array of number by min and max.
 *
 * @param from - Must be between 1024 and 65535
 * @param to   - Must be between 1024 and 65535 and greater than from
 */
export function makeRange(from: number, to: number): number[] {
  if (!(from > MIN_PORT || from < MAX_PORT)) {
    throw new RangeError("`from` must be between 1024 and 65535");
  }
  if (!(to > MIN_PORT || to < MAX_PORT)) {
    throw new RangeError("`to` must be between 1024 and 65536");
  }
  if (!(to > from)) {
    throw new RangeError("`to` must be greater than or equal to `from`");
  }
  const ports = [];
  for (let port = from; port <= to; port++) {
    ports.push(port);
  }
  return ports;
}

/**
 * Return a random port between 1024 and 65535.
 *
 * @param hostname
 */
export function randomPort(hostname?: string): number {
  const port = Math.ceil(Math.random() * ((MAX_PORT - 1) - MIN_PORT + 1) + MIN_PORT + 1);
  const result: CheckedPort = checkPort({ hostname, port });
  if (result.valid) {
    return result.port;
  }
  return randomPort(hostname);
}

/**
 * Return available port.
 *
 * @param port
 * @param hostname
 */
export default function getPort(port?: number | number[], hostname?: string): number {
  const listenOptions: Deno.ListenOptions = {
    hostname: hostname || "0.0.0.0",
    port: (port && !Array.isArray(port)) ? port : 0,
  };

  if (!port || Array.isArray(port)) {
    const ports: number[] = (Array.isArray(port)) ? port : makeRange(MIN_PORT + 1, MAX_PORT - 1);
    for (const port of ports) {
      const result: CheckedPort = checkPort({ ...listenOptions, port });
      if (result.valid) return result.port;
    }
    return getPort(ports[ports.length - 1]);
  }

  const result: CheckedPort = checkPort(listenOptions);
  if (!result.valid) {
    const range = makeRange(result.port + 1, MAX_PORT - 1);
    return getPort(range);
  }

  return result.port;
}

export type CheckedPort = {
  valid: boolean;
  port: number;
};
