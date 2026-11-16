# Job Board - Saved Jobs Feature
## Approach & Implementation Notes

> **Note:** Anonymous submission as requested in the instructions (no name, college name, or photo included).

---

### 1. What was the task?
The starter app is a small job board built with plain Node.js. It lists jobs from a JSON file and lets users search through them.

Our task is to let students:
1. Save jobs they like by clicking a "Save" button.
2. View their saved jobs in a list on the same page.
3. Remove jobs from the saved list.
4. Keep saved jobs saved even after refreshing the page or restarting the server (saving to a JSON file).
5. Build the required API:
   - `POST /api/saved` with `{ "jobId": "..." }`
   - `GET /api/saved`
   - `DELETE /api/saved/:jobId`
6. Make sure saving the same job twice does not create duplicates.
7. Return a clear error if an unknown job ID is submitted instead of crashing.
8. Write tests for the new features using Node's built-in test runner.

---

### 2. Tools Used & Why
- **Node.js (version 20+) built-in modules only (`node:http`, `node:fs/promises`, `node:test`)**:
  - The instructions asked for no external packages.
  - Plain Node has everything we need to run the server, handle files, and run tests without running `npm install`.
- **Vanilla HTML & JavaScript**:
  - The starter app already uses simple plain HTML and JavaScript in the `public/` folder, so we keep that same style.
- **AI Tool Disclosure**:
  - Used Antigravity (AI assistant) to help structure the code, test cases, and draft documentation. All code was reviewed and verified step-by-step.

---

### 3. Step-by-Step Implementation

#### Step 1: Storage helper functions (`lib/saved.js`)
We created a separate helper file `lib/saved.js` to handle reading and writing to `saved.json`. This keeps the storage code separate from the server routes so it's easy to read and test.

What was added:
- `loadSavedIds(path)`: Reads the saved job IDs from `saved.json`. If the file doesn't exist yet, it simply returns an empty list `[]` instead of crashing.
- `saveJobId(id, path)`: Adds the job ID to the list. If it is already saved, it doesn't add it again (preventing duplicates). Then it writes the list to `saved.json`.
- `removeJobId(id, path)`: Filters out the job ID and writes the updated list back to the file.
- `getSavedJobs(allJobs, savedIds)`: Takes the saved IDs and finds the matching job details from the main jobs list so we can send full job details to the frontend.

**Key decision for Step 1:**
We only stored the job IDs (like `["j1", "j2"]`) in `saved.json` instead of copying the whole job object. That way, if a job's details (like stipend or location) change in `jobs.json`, the saved list will always show the updated info automatically.

---

#### Step 2: Adding the API routes (`server.js`)
Next, we updated `server.js` to handle the three new routes:

1. **`readJsonBody(req)` helper:**
   - In Node's built-in `http` module, request bodies arrive in chunks (streams).
   - This small helper collects the chunks and parses them into a JavaScript object.
   - If someone sends invalid JSON or an empty body, it handles it safely instead of crashing the server.

2. **`GET /api/saved`:**
   - Reads the saved job IDs from `saved.json`.
   - Looks up the full job details from `jobs.json`.
   - Returns the list as a JSON array with status `200`.

3. **`POST /api/saved`:**
   - Reads the request body.
   - Validates that `jobId` is provided and is a non-empty string. If missing, returns status `400` with `{ "error": "jobId is required" }`.
   - Checks if the job exists in `jobs.json`. If not found, returns status `404` with `{ "error": "Job not found" }` (as required: clear error, no crash).
   - Saves the job ID to `saved.json` and returns status `201` with `{ "ok": true, "job": ... }`.

4. **`DELETE /api/saved/:jobId`:**
   - Extracts the `jobId` from the URL path.
   - Calls `removeJobId` to remove it from `saved.json`.
   - Returns status `200` with `{ "ok": true }`.

**Key decision for Step 2:**
We allowed `createApp({ savedPath })` to take an optional file path for `saved.json`. In normal use, it defaults to the root `saved.json`. When running automated tests, we can give it a temporary file so our tests don't mess up our real saved jobs.

---

#### Step 3: Updating the frontend UI (`public/index.html` & `public/app.js`)
We updated the web page so users can see and interact with their saved jobs:

1. **Saved jobs section:**
   - Added a `<h2>Saved jobs</h2>` section at the top of the page with its own list (`<ul id="saved-jobs"></ul>`).
   - If no jobs are saved, it shows a clean message: *"No saved jobs yet."*
   - Each saved job item has a red "Remove" button that triggers `DELETE /api/saved/:id`.

2. **Save button on all jobs:**
   - In the "All jobs" list, each job card now has a "Save" button.
   - When clicked, it sends a `POST /api/saved` request with `{ "jobId": job.id }`.
   - Once saved, the button changes to "Saved" and is disabled so users can clearly see which jobs they have already saved.

3. **UI Polish & Feedback:**
   - **Saved counter badge:** Added a dynamic count badge next to "Saved jobs" (`Saved jobs (2)`) that updates immediately on save or remove.
   - **Visual status buttons:** "Save" has a clear primary blue style, "Saved" turns into a muted badge with a checkmark (`✓ Saved`), and "Remove" has a subtle red styling.
   - **Job tags & metadata:** Clean tags for location (e.g. green tag for `Remote`) and bolded stipend (`₹15,000/month`) for quick scanning.

4. **Page reloads:**
   - When the page loads or refreshes, `loadSavedJobs()` immediately fetches `/api/saved` from the server.
   - Because the server stores saved jobs in `saved.json`, the user's saved jobs remain there even after closing or refreshing the browser.

---

#### Step 4: Automated Tests (`test/saved.test.js`)
We added automated tests using Node's built-in test runner (`node --test`), so anyone can verify everything works by running `npm test`:

1. **Storage unit tests:**
   - Checked that reading a non-existent file returns `[]` without error.
   - Checked that saving a job adds it to disk.
   - Checked that saving the same job twice does not create duplicates (idempotency).
   - Checked that removing a job removes it from disk.
   - Checked that `getSavedJobs` pairs saved IDs with their full job objects.

2. **API integration tests:**
   - Tested that `GET /api/saved` starts with an empty list.
   - Tested that `POST /api/saved` saves a job and returns status `201`.
   - Tested that posting the same job twice keeps only one copy.
   - Tested that posting an unknown job ID returns status `404` and an error message (doesn't crash).
   - Tested that posting without a `jobId` returns status `400`.
   - Tested that `DELETE /api/saved/:id` removes the job and returns status `200`.

*All tests use temporary files that get cleaned up automatically, so running tests never touches development data.*

---

### 4. What Would We Do Next?
If we had more time to expand the project:
1. **User Accounts / Multi-user Support:** Right now, saved jobs are stored in one file for everyone. Adding simple user sessions or authentication would let each student have their own private saved jobs list.
2. **Undo Button:** If a student accidentally clicks "Remove", a quick "Undo" popup would let them restore the saved job.
3. **Database Migration:** For a larger site with thousands of users, we would move from a single `saved.json` file to a database like SQLite or PostgreSQL.
