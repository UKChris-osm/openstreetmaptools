import { queryOverpass } from "./overpass/client";

const QUERY = `
[out:json][timeout:60];

rel(62149)->.uk;
.uk map_to_area->.uk_area;

nwr["amenity"="post_office"](area.uk_area);

out center;
`;

console.log("Testing full UK Post Office data download...\n");

const started = performance.now();

const result = await queryOverpass(QUERY);

const totalDuration = performance.now() - started;

const elements = result.data.elements ?? [];

const counts = {
  nodes: 0,
  ways: 0,
  relations: 0,
};

for (const element of elements) {
  if (element.type === "node") counts.nodes++;
  if (element.type === "way") counts.ways++;
  if (element.type === "relation") counts.relations++;
}

const responseMiB = result.responseBytes / (1024 * 1024);

console.log("\n========== DOWNLOAD STATISTICS ==========");
console.log(`Server: ${result.server}`);
console.log(`Objects: ${elements.length.toLocaleString()}`);
console.log(`Nodes: ${counts.nodes.toLocaleString()}`);
console.log(`Ways: ${counts.ways.toLocaleString()}`);
console.log(`Relations: ${counts.relations.toLocaleString()}`);
console.log(`Response size: ${responseMiB.toFixed(2)} MiB`);
console.log(`Query duration: ${(result.durationMs / 1000).toFixed(2)} seconds`);
console.log(`Total elapsed: ${(totalDuration / 1000).toFixed(2)} seconds`);

if (result.timestampOsmBase) {
  console.log(`OSM timestamp: ${result.timestampOsmBase}`);
}

console.log("=".repeat(20));
