
import { OVERPASS_SERVERS } from "./servers";
import { checkServerHealth } from "./health";

import type {
  OverpassQueryResult,
  OverpassResponse,
  OverpassServer,
} from "./types";

const RETRYABLE_STATUSES = [429, 502, 503, 504];

const MAX_ATTEMPTS = 2;
const INITIAL_RETRY_DELAY = 5;
const MAX_RETRY_AFTER = 15;

class OverpassHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "OverpassHttpError";
  }
}

function sleep(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

function getRetryDelay(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const seconds = Number(value);

  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds;
  }

  const date = Date.parse(value);

  if (Number.isNaN(date)) {
    return null;
  }

  return Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

async function queryServer(
  server: OverpassServer,
  query: string,
): Promise<OverpassQueryResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": "OpenStreetMap Data Tools",
  };

  if (server.referer) {
    headers.Referer = server.referer;
  }

  const started = performance.now();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(
      `Submitting query to ${server.name} (attempt ${attempt}/${MAX_ATTEMPTS})...`,
    );

    let response: Response;

    try {
      response = await fetch(server.interpreterUrl, {
        method: "POST",
        headers,
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(
          (server.timeoutSeconds + 15) * 1000,
        ),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      throw new Error(`${server.name} request failed: ${message}`);
    }

    if (!response.ok) {
      const details = await response.text();

      if (RETRYABLE_STATUSES.includes(response.status)) {
        if (attempt < MAX_ATTEMPTS) {
          const retryAfter = getRetryDelay(
            response.headers.get("Retry-After"),
          );

          const delay = retryAfter ?? INITIAL_RETRY_DELAY * attempt;

          if (delay <= MAX_RETRY_AFTER) {
            console.warn(
              `${server.name} returned HTTP ${response.status}. Retrying in ${delay} seconds.`,
            );

            await sleep(delay);
            continue;
          }

          console.warn(
            `${server.name} requested a ${delay}-second retry delay. Moving to the next server instead.`,
          );
        }
      }

      throw new OverpassHttpError(
        response.status,
        `${server.name} returned HTTP ${response.status} ${response.statusText}\n${details.slice(0, 1000)}`,
      );
    }

    let data: OverpassResponse;
    let responseBytes: number;

    try {
      const buffer = await response.arrayBuffer();

      responseBytes = buffer.byteLength;

      const responseText = new TextDecoder().decode(buffer);

      data = JSON.parse(responseText) as OverpassResponse;
    } catch {
      throw new Error(`${server.name} returned invalid JSON.`);
    }

    if (data.remark) {
      throw new Error(`${server.name} Overpass query error: ${data.remark}`);
    }

    const durationMs = Math.round(performance.now() - started);
    const timestampOsmBase = data.osm3s?.timestamp_osm_base;

    const responseMiB = responseBytes / (1024 * 1024);

    console.log(`Query successful using ${server.name}.`);
    console.log(`Query duration: ${(durationMs / 1000).toFixed(2)} seconds`);
    console.log(`Response size: ${responseMiB.toFixed(2)} MiB`);

    if (timestampOsmBase) {
      console.log(`OSM database timestamp: ${timestampOsmBase}`);
    }

    return {
      data,
      server: server.name,
      durationMs,
      responseBytes,
      timestampOsmBase,
    };
  }

  throw new Error(`${server.name} exhausted its retry attempts.`);
}

export async function queryOverpass(
  query: string,
): Promise<OverpassQueryResult> {
  if (!query.trim()) {
    throw new Error("An Overpass query must be supplied.");
  }

  const failures: string[] = [];

  for (const server of OVERPASS_SERVERS) {
    console.log("");
    console.log(`--- Overpass server: ${server.name} ---`);

    await checkServerHealth(server);

    try {
      return await queryServer(server, query);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      console.error(`Server failed: ${message}`);

      if (error instanceof OverpassHttpError && error.status === 400) {
        throw error;
      }

      failures.push(message);
    }
  }

  throw new Error(
    `All Overpass servers failed:\n${failures.join("\n\n")}`,
  );
}
