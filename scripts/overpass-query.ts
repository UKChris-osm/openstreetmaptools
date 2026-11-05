// Query Overpass for OSM post office objects within the UK boundary.
//
// Run directly through the Post Office script:
//   bun run osm:postoffice

import { queryOverpass } from "./overpass/client";

import type { OverpassResponse } from "./overpass/types";

const UK_RELATION_ID = 62149;

interface OverpassCountElement {
  type: "count";
  tags?: Record<string, string>;
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
  console.log("Querying Overpass for UK post offices...");

  const result = await queryOverpass(QUERY);

  const data = result.data as OverpassResponse;

  const countElement = data.elements?.find((element) => element.type === "count",) as OverpassCountElement | undefined;

  const tags = countElement?.tags;

  if (tags?.total === undefined) {
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

  console.log(`OSM currently contains ${counts.total.toLocaleString()} post office objects.`,);

  return counts;
}
