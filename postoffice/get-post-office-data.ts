import { join } from "node:path";
import { createTempDirectory, removeTempDirectory } from "../scripts/temp-files";
import { queryPostOfficeCount } from "../scripts/overpass-query";

console.log("Let's get some Post Office Branches!");

// This is the URL the Post Office give as a starting point, and should include the latest link to the .xlsx workbook file containing the
// Post Office branch data. The .xlsx filename, however, may not be consistent, and the filename will need to be found with the main web page.
const PAGE_URL = "https://corporate.postoffice.co.uk/en/governance/reports-statements/post-office-network-report/";

// Download the HTML source, and look for the workbook filename to be extracted and downloaded.
async function findLatestWorkbook(): Promise<string> {
  console.log("Fetching Post Office Network Report page...");

  const response = await fetch(PAGE_URL, {
    headers: {
      // Might need to fake a standard browser header.
      "User-Agent": "OpenStreetMap Post Office Data Fetcher",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Post Office page: HTTP ${response.status}`);
  }

  const html = await response.text();

  // Find links pointing to XLSX files.
  const links = html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,);

  for (const match of links) {
    const href = match[1];

    if (!href) continue;

    const url = new URL(href, PAGE_URL);

    if (url.pathname.toLowerCase().endsWith(".xlsx")) {
      console.log(`Found workbook: ${url.href}`);
      return url.href;
    }
  }

  throw new Error("No Excel workbook link found on the Post Office webpage.");
}

async function downloadWorkbook(url: string, tempDir: string): Promise<string> {
  console.log("Downloading Post Office workbook...");

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download workbook: HTTP ${response.status}`,);
  }

  const workbook = await response.arrayBuffer();
  const filePath = join(tempDir, "post-office-branches.xlsx");

  await Bun.write(filePath, workbook);

  console.log(`Downloaded workbook: ${(workbook.byteLength / 1024 / 1024).toFixed(2)} MB`,);

  return filePath;
}

async function main() {
  // Find the workbook URL.
  const workbookUrl = await findLatestWorkbook();
  console.log("Ready to download:", workbookUrl);

  // Create a unique temporary directory.
  const tempDir = await createTempDirectory("postoffice");

  try {
    // Download the workbook.
    const workbookPath = await downloadWorkbook(workbookUrl, tempDir);
    console.log(`Workbook saved to: ${workbookPath}`);
    
    // We'll process the workbook here.
  } finally {
    // Remove the temporary directory and everything inside it.
    await removeTempDirectory(tempDir);
    console.log("Temporary files cleaned up.");
  }

  // Find the number of post offices currently mapped in OSM.
    const osmCounts = await queryPostOfficeCount();
    console.log(`OSM currently contains ${osmCounts.total} post office objects.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
