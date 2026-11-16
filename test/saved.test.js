import { test, after } from "node:test";
import assert from "node:assert/strict";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createApp } from "../server.js";
import { loadJobs } from "../lib/jobs.js";
import { getSavedJobs, loadSavedIds, removeJobId, saveJobId } from "../lib/saved.js";

const testSavedPath = join(tmpdir(), `test-saved-${Date.now()}.json`);

after(async () => {
  try {
    await unlink(testSavedPath);
  } catch {}
});

test("storage: returns empty array when saved file does not exist", async () => {
  const missingPath = join(tmpdir(), `missing-${Date.now()}.json`);
  const ids = await loadSavedIds(missingPath);
  assert.deepEqual(ids, []);
});

test("storage: saves a job and prevents duplicate entries", async () => {
  await saveJobId("j1", testSavedPath);
  let ids = await loadSavedIds(testSavedPath);
  assert.deepEqual(ids, ["j1"]);

  // Saving the same job again should keep only 1 copy
  await saveJobId("j1", testSavedPath);
  ids = await loadSavedIds(testSavedPath);
  assert.deepEqual(ids, ["j1"]);

  // Saving another job
  await saveJobId("j2", testSavedPath);
  ids = await loadSavedIds(testSavedPath);
  assert.deepEqual(ids, ["j1", "j2"]);
});

test("storage: removes a job id", async () => {
  await removeJobId("j1", testSavedPath);
  const ids = await loadSavedIds(testSavedPath);
  assert.deepEqual(ids, ["j2"]);
});

test("storage: getSavedJobs maps ids to full job objects", async () => {
  const allJobs = await loadJobs();
  const saved = getSavedJobs(allJobs, ["j2"]);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].id, "j2");
  assert.equal(saved[0].company, "Kite Learning");
});

test("api: full lifecycle (GET, POST, DELETE, and error handling)", async () => {
  const apiTestPath = join(tmpdir(), `api-test-${Date.now()}.json`);
  const server = createApp({ savedPath: apiTestPath });

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 1. GET /api/saved returns empty list initially
    const resEmpty = await fetch(`${baseUrl}/api/saved`);
    assert.equal(resEmpty.status, 200);
    const emptyList = await resEmpty.json();
    assert.deepEqual(emptyList, []);

    // 2. POST /api/saved saves a job
    const resSave = await fetch(`${baseUrl}/api/saved`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId: "j1" }),
    });
    assert.equal(resSave.status, 201);
    const saveBody = await resSave.json();
    assert.equal(saveBody.ok, true);
    assert.equal(saveBody.job.id, "j1");

    // 3. POST /api/saved duplicate keeps one copy
    await fetch(`${baseUrl}/api/saved`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId: "j1" }),
    });
    const resSavedList = await fetch(`${baseUrl}/api/saved`);
    const savedList = await resSavedList.json();
    assert.equal(savedList.length, 1);
    assert.equal(savedList[0].id, "j1");

    // 4. POST /api/saved with unknown id returns 404 without crashing
    const resUnknown = await fetch(`${baseUrl}/api/saved`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId: "unknown-id" }),
    });
    assert.equal(resUnknown.status, 404);
    const unknownBody = await resUnknown.json();
    assert.equal(unknownBody.error, "Job not found");

    // 5. POST /api/saved without jobId returns 400
    const resMissing = await fetch(`${baseUrl}/api/saved`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(resMissing.status, 400);

    // 6. DELETE /api/saved/j1 removes the job
    const resDelete = await fetch(`${baseUrl}/api/saved/j1`, {
      method: "DELETE",
    });
    assert.equal(resDelete.status, 200);

    // 7. Verify GET /api/saved is now empty
    const resAfterDelete = await fetch(`${baseUrl}/api/saved`);
    const listAfterDelete = await resAfterDelete.json();
    assert.deepEqual(listAfterDelete, []);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    try {
      await unlink(apiTestPath);
    } catch {}
  }
});
