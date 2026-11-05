
// Query Overpass for OSM post office objects within the UK boundary.
//
// Run directly with:
//   bun run scripts/overpass-query.ts

const OVERPASS_API_URL = "https://api.overpass.ch/v1";
const UK_RELATION_ID = 62149;

interface OverpassCountElement {
  type: "count";
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassCountElement[];
  remark?: string;
  osm3s?: {
    timestamp_osm_base?: string;
  };
}

export interface PostOfficeObjectCounts {
  total: number;
  nodes: number;
  ways: number;
  relations: number;
}

const QUERY = `
[out:json][timeout:60];

rel(${UK_RELATION_ID})->.uk;
.uk map_to_area->.uk_area;

nwr["amenity"="post_office"](area.uk_area);

out count;
`;

export async function queryPostOfficeCount(): Promise<PostOfficeObjectCounts> {
  const apiKey = process.env.OVERPASS_CH_KEY;

  if (!apiKey) {
    throw new Error("Missing OVERPASS_CH_KEY environment variable.");
  }

  const endpoint = `${OVERPASS_API_URL}/${apiKey}/interpreter`;

  console.log("Querying overpass.ch for UK post offices...");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "OpenStreetMap Post Office Data Tool",
    },
    body: new URLSearchParams({ data: QUERY }),
    signal: AbortSignal.timeout(75_000),
  });

  if (!response.ok) {
    const details = await response.text();

    throw new Error(
      `Overpass request failed: HTTP ${response.status} ${response.statusText}\n${details.slice(0, 500)}`,
    );
  }

  const data = (await response.json()) as OverpassResponse;

  if (data.remark) {
    throw new Error(`Overpass query error: ${data.remark}`);
  }

  if (data.osm3s?.timestamp_osm_base) {
    console.log(
      `OSM database timestamp: ${data.osm3s.timestamp_osm_base}`,
    );
  }

  const countElement = data.elements?.find(
    (element) => element.type === "count",
  );

  const tags = countElement?.tags;

  if (!tags?.total) {
    throw new Error("Overpass returned no count data for post offices.");
  }

  const counts: PostOfficeObjectCounts = {
    total: Number(tags.total),
    nodes: Number(tags.nodes ?? 0),
    ways: Number(tags.ways ?? 0),
    relations: Number(tags.relations ?? 0),
  };

  if (Object.values(counts).some((count) => !Number.isFinite(count))) {
    throw new Error("Overpass returned invalid count values.");
  }

  return counts;
}

// Only run automatically when this file is executed directly.
if (import.meta.main) {
  queryPostOfficeCount()
    .then((counts) => {
      console.log(
        `Found ${counts.total.toLocaleString()} OSM post office objects:`,
      );
      console.log(`  Nodes:     ${counts.nodes.toLocaleString()}`);
      console.log(`  Ways:      ${counts.ways.toLocaleString()}`);
      console.log(`  Relations: ${counts.relations.toLocaleString()}`);
    })
    .catch((error: unknown) => {
      console.error("Overpass query failed:", error);
      process.exit(1);
    });
}
