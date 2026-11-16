const jobsList = document.getElementById("jobs");
const savedList = document.getElementById("saved-jobs");
const savedCount = document.getElementById("saved-count");
const search = document.getElementById("search");

let savedJobIds = new Set();

// Creates formatted job information card
function createJobInfo(job) {
  const info = document.createElement("div");
  info.className = "job-info";

  const title = document.createElement("div");
  title.className = "job-title";
  title.textContent = `${job.title} · ${job.company}`;

  const meta = document.createElement("div");
  meta.className = "job-meta";

  const locTag = document.createElement("span");
  const isRemote = String(job.location).toLowerCase() === "remote";
  locTag.className = `tag ${isRemote ? "tag-remote" : ""}`;
  locTag.textContent = job.location;

  const stipend = document.createElement("span");
  stipend.className = "stipend";
  stipend.textContent = `₹${job.stipend.toLocaleString("en-IN")}/month`;

  meta.append(locTag, stipend);
  info.append(title, meta);
  return info;
}

// Fetch and display saved jobs
async function loadSavedJobs() {
  const res = await fetch("/api/saved");
  const savedJobs = await res.json();
  savedJobIds = new Set(savedJobs.map((j) => j.id));

  // Update counter badge
  if (savedCount) {
    savedCount.textContent = savedJobs.length;
  }

  savedList.innerHTML = "";
  if (savedJobs.length === 0) {
    const emptyLi = document.createElement("li");
    emptyLi.className = "empty-msg";
    emptyLi.textContent = "No saved jobs yet.";
    savedList.append(emptyLi);
    return;
  }

  for (const job of savedJobs) {
    const li = document.createElement("li");
    li.className = "job-card";

    const info = createJobInfo(job);

    const removeBtn = document.createElement("button");
    removeBtn.className = "btn-remove";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => removeJob(job.id));

    li.append(info, removeBtn);
    savedList.append(li);
  }
}

// Fetch and display all jobs (filtered by search query)
async function loadJobs(query = "") {
  const res = await fetch(`/api/jobs?q=${encodeURIComponent(query)}`);
  const jobs = await res.json();

  jobsList.innerHTML = "";
  if (jobs.length === 0) {
    const emptyLi = document.createElement("li");
    emptyLi.className = "empty-msg";
    emptyLi.textContent = "No jobs found.";
    jobsList.append(emptyLi);
    return;
  }

  for (const job of jobs) {
    const li = document.createElement("li");
    li.className = "job-card";

    const info = createJobInfo(job);

    const saveBtn = document.createElement("button");
    const isSaved = savedJobIds.has(job.id);

    if (isSaved) {
      saveBtn.className = "btn-saved";
      saveBtn.textContent = "✓ Saved";
      saveBtn.disabled = true;
    } else {
      saveBtn.className = "btn-save";
      saveBtn.textContent = "Save";
      saveBtn.disabled = false;
      saveBtn.addEventListener("click", () => saveJob(job.id));
    }

    li.append(info, saveBtn);
    jobsList.append(li);
  }
}

// Save a job
async function saveJob(jobId) {
  const res = await fetch("/api/saved", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jobId }),
  });

  if (res.ok) {
    await loadSavedJobs();
    await loadJobs(search.value);
  } else {
    const data = await res.json().catch(() => ({}));
    alert(data.error || "Could not save job.");
  }
}

// Remove a saved job
async function removeJob(jobId) {
  const res = await fetch(`/api/saved/${encodeURIComponent(jobId)}`, {
    method: "DELETE",
  });

  if (res.ok) {
    await loadSavedJobs();
    await loadJobs(search.value);
  } else {
    alert("Could not remove saved job.");
  }
}

search.addEventListener("input", () => loadJobs(search.value));

// Initial load
async function init() {
  await loadSavedJobs();
  await loadJobs();
}

init();
