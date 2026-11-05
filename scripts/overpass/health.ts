import type { OverpassHealth, OverpassHealthResult, OverpassServer } from "./types";

export async function checkServerHealth(server: OverpassServer,): Promise<OverpassHealthResult | null> {
  if (!server.healthUrl) {
    return null;
  }

  console.log(`Checking ${server.name} health...`);

  try {
    const response = await fetch(server.healthUrl, {
      method: "GET",
      headers: {
        "User-Agent": "OpenStreetMap Data Tools",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const health = (await response.json()) as OverpassHealth;

    console.log(`  Status: ${health.status ?? "unknown"}`);

    if (health.in_flight !== undefined) {
      console.log(`  Queries in flight: ${health.in_flight}`);
    }

    if (health.lag_seconds !== undefined) {
      console.log(`  Database lag: ${health.lag_seconds} seconds`);
    }

    if (health.timestamp_osm_base) {
      console.log(`  Database timestamp: ${health.timestamp_osm_base}`);
    }

    for (const component of ["elevation", "geocoding", "maps"] as const) {
      if (health[component] !== undefined) {
        console.log(`  ${component}: ${health[component]}`);
      }
    }

    if (health.status !== "ok") {
      console.warn(
        `Warning: ${server.name} reports an unhealthy service.`,
      );
    }

    return {
      server: server.name,
      available: health.status === "ok",
      health,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.warn(`${server.name} health check failed: ${message}`);
    console.warn("Continuing with the Overpass query anyway.");

    return {
      server: server.name,
      available: false,
      error: message,
    };
  }
}
