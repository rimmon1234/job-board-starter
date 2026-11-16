# Job Board - Saved Jobs Feature
## Approach & Implementation Notes

---

### 1. What was the task?
The starter app is a small job board built with plain Node.js. It lists jobs from a JSON file and lets users search through them.

Our task was to let students:
1. Save jobs they like by clicking a "Save" button on each job card.
2. View their saved jobs in a list on the same page.
3. Remove jobs from the saved list.
4. Keep saved jobs saved even after refreshing the page or restarting the server (saving to a JSON file on the server).
5. Build the required API endpoints:
   - `POST /api/saved` with `{ "jobId": "..." }`
   - `GET /api/saved`
   - `DELETE /api/saved/:jobId`
6. Make sure saving the same job twice keeps only one copy (no duplicate items).
7. Return a clear error if an unknown job ID is submitted instead of crashing the server.
8. Write tests for the new features using Node's built-in test runner.

---

### 2. Tools Used & Why
- **Node.js (version 20+) built-in modules only (`node:http`, `node:fs/promises`, `node:test`)**:
  - The instructions asked for no external packages.
  - Plain Node has everything we need to run the server, handle files, and run tests without running `npm install`.
- **Vanilla HTML & JavaScript**:
  - The starter app already uses plain HTML and JavaScript in the `public/` folder, so we kept that same structure without adding heavy frontend frameworks or build steps.
- **AI Tool Disclosure**:
  - Used Antigravity (AI assistant) to help structure the code, write test cases, and draft documentation. All code and logic were reviewed and tested step-by-step.

---

### 3. Step-by-Step Implementation

#### Step 1: Storage helper functions (`lib/saved.js`)
We created a separate helper file `lib/saved.js` to handle reading and writing to `saved.json`. This keeps the storage code separate from the server routes so it's clean, easy to read, and easy to test independently.

What was added:
- `loadSavedIds(path)`:
  - Reads the saved job IDs from `saved.json`.
  - If the file doesn't exist yet (first time running), it catches the `ENOENT` error and returns an empty list `[]` instead of crashing.
  - Also verifies the parsed content is an array to avoid unexpected crashes.
- `saveJobId(id, path)`:
  - Reads the current saved IDs.
  - Checks if the job ID is already in the list using `ids.includes(id)`.
  - If it is already saved, it skips adding it so duplicates are never saved.
  - Writes the updated list back to `saved.json`.
- `removeJobId(id, path)`:
  - Filters out the specified job ID from the list.
  - Writes the updated array back to disk only if an item was actually removed.
- `getSavedJobs(allJobs, savedIds)`:
  - Takes the saved IDs and looks up their full details (title, company, stipend, location) from the main jobs list.
  - Preserves the order in which the user saved the jobs.

**Key decision for Step 1:**
We chose to store only the job IDs (like `["j1", "j2"]`) in `saved.json` rather than copying the full job data. This keeps `jobs.json` as the single source of truth. If a company updates its stipend or location, the saved jobs list automatically displays the updated details.

---

#### Step 2: Adding the API routes (`server.js`)
Next, we updated `server.js` to handle the new routes while keeping the existing `/api/jobs` and static file serving untouched:

1. **`readJsonBody(req)` helper:**
   - In Node's built-in `http` module, request bodies arrive as streamed chunks of data.
   - This helper listens for data chunks, joins them together, and parses the JSON.
   - If a request sends invalid JSON or an empty body, it handles it safely and returns `null` so the server can reply with a `400 Bad Request` instead of crashing.

2. **`GET /api/saved`:**
   - Reads the saved job IDs from `saved.json`.
   - Looks up the full job details from `jobs.json` using `getSavedJobs`.
   - Returns the list as a JSON array with status `200 OK`.

3. **`POST /api/saved`:**
   - Reads the request body.
   - Validates that `jobId` is provided and is a non-empty string. If missing or invalid, returns status `400` with `{ "error": "jobId is required" }`.
   - Checks if the job exists in `jobs.json` using `findJob()`. If it doesn't exist, returns status `404` with `{ "error": "Job not found" }` (fulfilling the requirement for a clear error with no crash).
   - Saves the job ID to `saved.json` and returns status `201 Created` with `{ "ok": true, "job": ... }`.

4. **`DELETE /api/saved/:jobId`:**
   - Extracts the `jobId` from the URL path using `decodeURIComponent(url.pathname.slice("/api/saved/".length))`.
   - Calls `removeJobId` to remove it from `saved.json`.
   - Returns status `200 OK` with `{ "ok": true }`.

**Key decision for Step 2:**
We allowed `createApp({ savedPath })` to take an optional file path for `saved.json`. In production, it defaults to the root `saved.json`. In automated tests, we can supply a temporary file path so tests never touch or corrupt actual user data.

---

#### Step 3: Updating the frontend UI (`public/index.html` & `public/app.js`)
We updated the frontend so students can view, save, and remove jobs easily on the same page:

1. **Saved jobs list & counter:**
   - Added a `<h2>Saved jobs</h2>` section at the top of the page with a live count badge (`Saved jobs (2)`).
   - If no jobs have been saved yet, it displays a clean placeholder message: *"No saved jobs yet."*
   - Each saved job card displays full job details along with a "Remove" button that triggers `DELETE /api/saved/:id`.

2. **Save button with active state:**
   - Each job card in the main list has a "Save" button.
   - When clicked, it sends a `POST /api/saved` request with `{ "jobId": job.id }`.
   - Once saved, the button updates to "✓ Saved" and is disabled, giving clear visual confirmation that the job is already saved.

3. **State synchronization:**
   - When a job is saved or removed, both the saved jobs list and the main jobs list are updated.
   - This ensures that if you remove a job from the saved list, its corresponding button in the main list immediately changes back from "✓ Saved" to "Save".
   - Even when typing in the search box to filter jobs, the saved status on the filtered jobs remains accurate.

4. **Persistence across page reloads:**
   - When the page is refreshed or opened in a new tab, `loadSavedJobs()` immediately fetches `/api/saved` from the server.
   - Because the server stores the saved IDs in `saved.json`, all saved jobs remain intact.

---

#### Step 4: Automated Tests (`test/saved.test.js`)
We added automated tests using Node's built-in test runner (`node --test`), which can be executed with `npm test`:

1. **Storage unit tests:**
   - Checks that reading a missing file returns `[]` gracefully without throwing an unhandled error.
   - Checks that saving a job ID writes it to disk.
   - Checks that saving the same job ID multiple times keeps only one copy (idempotency).
   - Checks that removing a job ID updates the file.
   - Checks that `getSavedJobs` pairs saved IDs with their full job objects.

2. **API integration tests:**
   - Starts an isolated instance of the server on an ephemeral port (`port 0`), preventing port conflicts.
   - Tests that `GET /api/saved` starts with an empty list.
   - Tests that `POST /api/saved` saves a job and returns status `201`.
   - Tests that posting the same job twice keeps only one copy.
   - Tests that posting an unknown job ID returns status `404` and `{ "error": "Job not found" }` without crashing.
   - Tests that posting without a `jobId` returns status `400`.
   - Tests that `DELETE /api/saved/:id` removes the job and returns status `200`.

*All tests write to temporary files in the OS temp directory and automatically clean them up when finished, keeping development data untouched.*
