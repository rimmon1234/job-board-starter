# Job board starter

A small job board for an insiderOne work sample. It is made up: the jobs and
companies are not real.

## Run it

You need Node 20 or newer. There are no packages to install.

```
npm start      # then open http://localhost:3000
npm test       # runs the tests in test/
```

## What is here

- `server.js`: the web server with endpoints for jobs and saved jobs.
- `lib/jobs.js`: reading and searching the jobs. Pure functions.
- `lib/saved.js`: loading, saving, and removing saved job IDs.
- `jobs.json`: the jobs.
- `public/`: the page (`index.html`) and its script (`app.js`).
- `test/`: tests, using Node's built-in test runner.
- `APPROACH.md`: detailed explanation of the approach, steps, and tool usage.

---

## Saved Jobs Feature

### 1. What was built
- **Save button:** Added a "Save" button to each job on the board. When saved, the button changes to "Saved" (disabled) so it's clear it's already in the list.
- **Saved jobs section:** Added a "Saved jobs" section on the same page showing all jobs saved so far, complete with a "Remove" button for each.
- **Persistent storage:** Saved jobs are stored in `saved.json` on the server so they remain saved across page refreshes and server restarts.
- **REST API:**
  - `GET /api/saved` - lists all saved jobs.
  - `POST /api/saved` with `{ "jobId": "..." }` - saves a job. Saving the same job twice keeps only one copy. An unknown job ID returns a clear 404 error instead of crashing.
  - `DELETE /api/saved/:jobId` - removes a job from the saved list.
- **Automated tests:** Added full unit and API integration tests in `test/saved.test.js`.

### 2. How to run it and the tests
- **Run the app:**
  ```bash
  npm start
  ```
  Then open `http://localhost:3000` in your browser.
- **Run all tests:**
  ```bash
  npm test
  ```
  All 8 unit and integration tests run and pass using Node's built-in test runner.

### 3. One decision made and why
**Storing only `jobId`s in `saved.json` instead of full job objects:**
In `lib/saved.js`, we store an array of IDs (e.g. `["j1", "j2"]`). When a user requests their saved jobs (`GET /api/saved`), the server looks up the IDs in `jobs.json`. This keeps `jobs.json` as the **single source of truth**—if a job's stipend, title, or location changes in `jobs.json`, the saved list automatically displays the updated details with zero risk of stale data.

### 4. What to do next
If extending this further:
1. **User Authentication:** Currently, all visitors share one saved list. Adding session or token-based user authentication would give each student their own private saved jobs.
2. **Undo Action:** A temporary "Undo" toast notification when removing a saved job to prevent accidental deletions.
3. **Database Migration:** As traffic grows, migrate from a flat `saved.json` file to a database like SQLite or PostgreSQL for higher concurrency and ACID guarantees.
