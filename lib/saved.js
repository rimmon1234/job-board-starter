// Reading, saving, and removing saved jobs.
// Modular functions with configurable file paths for testability.
import { readFile, writeFile } from "node:fs/promises";

const DEFAULT_SAVED_PATH = new URL("../saved.json", import.meta.url);

/**
 * Loads the list of saved job IDs from the JSON file.
 * Returns an empty array if the file does not exist yet (ENOENT).
 */
export async function loadSavedIds(path = DEFAULT_SAVED_PATH) {
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err.code === "ENOENT") {
      return [];
    }
    throw err;
  }
}

/**
 * Saves a jobId. Deduplicates so saving the same job twice keeps one copy.
 * Returns the updated array of saved IDs.
 */
export async function saveJobId(id, path = DEFAULT_SAVED_PATH) {
  const ids = await loadSavedIds(path);
  if (!ids.includes(id)) {
    ids.push(id);
    await writeFile(path, JSON.stringify(ids, null, 2), "utf8");
  }
  return ids;
}

/**
 * Removes a jobId from the saved list.
 * Returns the updated array of saved IDs.
 */
export async function removeJobId(id, path = DEFAULT_SAVED_PATH) {
  const ids = await loadSavedIds(path);
  const updated = ids.filter((savedId) => savedId !== id);
  if (updated.length !== ids.length) {
    await writeFile(path, JSON.stringify(updated, null, 2), "utf8");
  }
  return updated;
}

/**
 * Maps a list of saved IDs to their full job objects, preserving saved order.
 */
export function getSavedJobs(allJobs, savedIds) {
  const jobMap = new Map(allJobs.map((j) => [j.id, j]));
  return savedIds.map((id) => jobMap.get(id)).filter(Boolean);
}
