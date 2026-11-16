// A small job board: a JSON API and one page. Run with `npm start`.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { findJob, loadJobs, searchJobs } from "./lib/jobs.js";
import { getSavedJobs, loadSavedIds, removeJobId, saveJobId } from "./lib/saved.js";

const PORT = Number(process.env.PORT ?? 3000);

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

// Reads the incoming JSON request body
async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return null; // Indicates invalid JSON
  }
}

export function createApp(options = {}) {
  const savedPath = options.savedPath;

  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");

      // 1. GET /api/jobs?q= - Search/list all jobs
      if (req.method === "GET" && url.pathname === "/api/jobs") {
        const jobs = await loadJobs();
        return sendJson(res, 200, searchJobs(jobs, url.searchParams.get("q")));
      }

      // 2. GET /api/saved - List saved jobs
      if (req.method === "GET" && url.pathname === "/api/saved") {
        const jobs = await loadJobs();
        const savedIds = await loadSavedIds(savedPath);
        return sendJson(res, 200, getSavedJobs(jobs, savedIds));
      }

      // 3. POST /api/saved - Save a job { "jobId": "..." }
      if (req.method === "POST" && url.pathname === "/api/saved") {
        const body = await readJsonBody(req);
        if (!body || typeof body.jobId !== "string" || !body.jobId.trim()) {
          return sendJson(res, 400, { error: "jobId is required" });
        }

        const jobs = await loadJobs();
        const job = findJob(jobs, body.jobId);
        if (!job) {
          return sendJson(res, 404, { error: "Job not found" });
        }

        await saveJobId(body.jobId, savedPath);
        return sendJson(res, 201, { ok: true, job });
      }

      // 4. DELETE /api/saved/:jobId - Remove a job from saved list
      if (req.method === "DELETE" && url.pathname.startsWith("/api/saved/")) {
        const jobId = decodeURIComponent(url.pathname.slice("/api/saved/".length));
        if (!jobId) {
          return sendJson(res, 400, { error: "jobId is required" });
        }
        await removeJobId(jobId, savedPath);
        return sendJson(res, 200, { ok: true });
      }

      // Serve static frontend assets
      if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/app.js")) {
        const file = url.pathname === "/" ? "index.html" : "app.js";
        const type = file.endsWith(".html") ? "text/html" : "text/javascript";
        const body = await readFile(new URL(`./public/${file}`, import.meta.url));
        res.writeHead(200, { "content-type": `${type}; charset=utf-8` });
        return res.end(body);
      }

      sendJson(res, 404, { error: "Not found" });
    } catch (err) {
      console.error(err);
      sendJson(res, 500, { error: "Something went wrong" });
    }
  });
}

// Started directly (npm start), not imported by a test.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createApp().listen(PORT, () => console.log(`Job board on http://localhost:${PORT}`));
}
