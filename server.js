const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const path = require("path");

const storage = require("./src/storage");
const { runPoller, getStatus } = require("./src/poller");
const { validateToken } = require("./src/facebook");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─── Cron Scheduler ──────────────────────────────────────────────
let cronJob = null;

function startCron() {
  const config = storage.getConfig();
  const mins = config.pollIntervalMinutes || 5;

  if (cronJob) cronJob.stop();

  // Cron: every N minutes
  cronJob = cron.schedule(`*/${mins} * * * *`, () => {
    console.log(`[CRON] Triggering poll at ${new Date().toISOString()}`);
    runPoller();
  });

  console.log(`[CRON] Scheduler started — polling every ${mins} minutes`);
}

startCron();

// ─── API Routes ───────────────────────────────────────────────────

// GET status
app.get("/api/status", (req, res) => {
  const status = getStatus();
  const config = storage.getConfig();
  const pages = storage.getSourcePages();
  res.json({
    status,
    totalPages: pages.length,
    activePages: pages.filter((p) => p.active).length,
    pollInterval: config.pollIntervalMinutes,
    configured: config.targetPageId !== "YOUR_TARGET_PAGE_ID",
  });
});

// GET config
app.get("/api/config", (req, res) => {
  res.json(storage.getConfig());
});

// POST update config
app.post("/api/config", (req, res) => {
  try {
    storage.updateConfig(req.body);
    // Restart cron if interval changed
    if (req.body.pollIntervalMinutes) startCron();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET source pages
app.get("/api/pages", (req, res) => {
  res.json(storage.getSourcePages());
});

// POST add source page
app.post("/api/pages", (req, res) => {
  try {
    const { id, name, token } = req.body;
    if (!id || !name) return res.status(400).json({ error: "id and name required" });
    storage.addSourcePage({ id, name, token: token || "" });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE source page
app.delete("/api/pages/:pageId", (req, res) => {
  try {
    storage.removeSourcePage(req.params.pageId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH toggle page active
app.patch("/api/pages/:pageId/toggle", (req, res) => {
  try {
    storage.toggleSourcePage(req.params.pageId, req.body.active);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET repost log
app.get("/api/logs", (req, res) => {
  res.json(storage.getRepostLog());
});

// POST manual poll trigger
app.post("/api/poll", async (req, res) => {
  try {
    runPoller(); // fire and forget
    res.json({ success: true, message: "Poll triggered" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST validate token
app.post("/api/validate-token", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "token required" });
  const result = await validateToken(token);
  res.json(result);
});

// Serve frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n🚀 FB AutoPoster running at http://localhost:${PORT}`);
  console.log(`📁 Data stored in ./data/store.json`);
  console.log(`⏱  Polling every ${storage.getConfig().pollIntervalMinutes} minutes\n`);
});
