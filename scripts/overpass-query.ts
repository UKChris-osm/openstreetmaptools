// Query Overpass for OSM post office objects within the UK boundary.
//
// Run directly with:
//   bun run scripts/overpass-query.ts

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const UK_RELATION_ID = 62149;

interface OverpassCountElement {
  type: "count";
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassCountElement[];
}

export interface PostOfficeObjectCounts {
  total: number;
  nodes: number;
  ways: number;
  relations: number;
}

const QUERY = `
[out:json][timeout:180];

rel(${UK_RELATION_ID})->.uk;
.uk map_to_area->.uk_area;

nwr["amenity"="post_office"](area.uk_area);

out count;
`;

export async function queryPostOfficeCount(): Promise<PostOfficeObjectCounts> {
  console.log("Querying Overpass for UK post offices...");

  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "OpenStreetMap Post Office Data Tool",
    },
    body: new URLSearchParams({ data: QUERY }),
  });

  if (!response.ok) {
    const details = await response.text();

    throw new Error(
      `Overpass request failed: HTTP ${response.status} ${response.statusText}\n${details.slice(0, 500)}`,
    );
  }

  const data = (await response.json()) as OverpassResponse;
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
