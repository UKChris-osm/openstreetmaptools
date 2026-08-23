const sourceUrl =
  "https://cdn.jsdelivr.net/npm/name-suggestion-index@latest/dist/wikidata/wikidata.min.json";

type LogoSources = Record<string, string>;

type NSIEntry = {
  logos?: LogoSources;
};

type WikidataEntries = Record<string, NSIEntry>;

type NSIData = {
  _meta: {
    version: string;
    generated: string;
    url: string;
    hash: string;
  };
  wikidata: WikidataEntries;
};

type ExtractedLogos = Record<string, LogoSources>;

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} bytes`;
  }

  const units = ["KiB", "MiB", "GiB"];
  let value = bytes;
  let unitIndex = -1;

  do {
    value /= 1024;
    unitIndex++;
  } while (value >= 1024 && unitIndex < units.length - 1);

  return `${value.toFixed(2)} ${units[unitIndex]} (${bytes.toLocaleString()} bytes)`;
}

console.log("Fetching NSI Wikidata data...");
console.log(sourceUrl);

const response = await fetch(sourceUrl);

if (!response.ok) {
  throw new Error(
    `Failed to fetch NSI Wikidata data: ${response.status} ${response.statusText}`,
  );
}

const buffer = await response.arrayBuffer();

console.log(`\nSource file size: ${formatBytes(buffer.byteLength)}`);
console.log("\nParsing JSON...");

const text = new TextDecoder().decode(buffer);
const data = JSON.parse(text) as NSIData;

console.log(`NSI version: ${data._meta.version}`);
console.log(`Generated: ${data._meta.generated}`);

const qids = Object.keys(data.wikidata);
const logos: ExtractedLogos = {};

let logoUrlCount = 0;

console.log(`Total Q-ID entries: ${qids.length.toLocaleString()}`);
console.log("\nExtracting logo URLs...");

for (const [qid, entry] of Object.entries(data.wikidata)) {
  if (!entry.logos || Object.keys(entry.logos).length === 0) {
    continue;
  }

  logos[qid] = entry.logos;
  logoUrlCount += Object.keys(entry.logos).length;
}

const output = `${JSON.stringify(logos, null, 2)}\n`;

console.log("\nWriting nsi-logos.json...");

await Bun.write("nsi-logos.json", output);

const outputSize = new TextEncoder().encode(output).byteLength;

console.log("\nComplete!");
console.log(`Q-ID entries processed: ${qids.length.toLocaleString()}`);
console.log(`Q-IDs with logos: ${Object.keys(logos).length.toLocaleString()}`);
console.log(`Total logo URLs: ${logoUrlCount.toLocaleString()}`);
console.log(`Source file size: ${formatBytes(buffer.byteLength)}`);
console.log(`nsi-logos.json size: ${formatBytes(outputSize)}`);
