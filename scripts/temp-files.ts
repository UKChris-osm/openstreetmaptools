import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Create a uniquely named temporary directory
export async function createTempDirectory(prefix = "osm"): Promise<string> {
  const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, "");

  return await mkdtemp(join(tmpdir(), `${safePrefix}-`));
}

// Remove a temporary directory and its contents.
export async function removeTempDirectory(path: string): Promise<void> {
  await rm(path, { recursive: true, force: true });
}
