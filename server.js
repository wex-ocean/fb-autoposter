const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const path = require("path");
const session = require("express-session");
const storage = require("./src/storage");
const { runPoller, getStatus } = require("./src/poller");
const { validateToken, configureApi, getApiConfig } = require("./src/facebook");
const { verifyPassword, requireAuth } = require("./src/auth");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10kb" }));

app.use(session({
  secret: process.env.SESSION_SECRET || "fb-autoposter-secret-key-change-this-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 8,
  },
}));

app.use(requireAuth);

app.use(express.static(path.join(__dirname, "public")));

let cronJob = null;

function startCron() {
  const config = storage.getConfig();
  const mins = Math.max(1, Math.min(60, config.pollIntervalMinutes || 5));

  if (cronJob) cronJob.stop();

  cronJob = cron.schedule(`*/${mins} * * * *`, () => {
    console.log(`[CRON] Triggering poll at ${new Date().toISOString()}`);
    runPoller();
  });

  console.log(`[CRON] Scheduler started — polling every ${mins} minutes`);
}

startCron();

app.get("/api/auth-check", (req, res) => {
  res.json({ authenticated: !!req.session.authenticated });
});

app.get("/api/status", (req, res) => {
  try {
    const status = getStatus();
    const config = storage.getConfig();
    const pages = storage.getSourcePages();
    const apiMode = getApiConfig().useDummyApi ? "Dummy API" : "Facebook Graph API";
    res.json({
      status,
      totalPages: pages.length,
      activePages: pages.filter((p) => p.active).length,
      pollInterval: config.pollIntervalMinutes,
      configured: !!(config.targetPageId && config.targetPageToken),
      apiMode,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get status" });
  }
});

app.get("/api/config", (req, res) => {
  try {
    res.json(storage.getConfig());
  } catch (err) {
    res.status(500).json({ error: "Failed to get config" });
  }
});

app.post("/api/config", (req, res) => {
  try {
    const { targetPageId, targetPageToken, pollIntervalMinutes, dummyApiEndpoint, useDummyApi } = req.body;

    if (typeof pollIntervalMinutes !== "undefined") {
      const mins = parseInt(pollIntervalMinutes);
      if (isNaN(mins) || mins < 1 || mins > 60) {
        return res.status(400).json({ error: "Poll interval must be between 1 and 60 minutes" });
      }
    }

    const updates = {};
    if (typeof targetPageId !== "undefined") updates.targetPageId = targetPageId.trim();
    if (typeof targetPageToken !== "undefined") updates.targetPageToken = targetPageToken.trim();
    if (typeof pollIntervalMinutes !== "undefined") updates.pollIntervalMinutes = parseInt(pollIntervalMinutes);
    if (typeof dummyApiEndpoint !== "undefined") updates.dummyApiEndpoint = dummyApiEndpoint.trim();

    if (typeof useDummyApi !== "undefined") {
      updates.useDummyApi = !!useDummyApi;
      if (updates.useDummyApi && updates.dummyApiEndpoint) {
        configureApi({
          useDummyApi: true,
          dummyApiEndpoint: updates.dummyApiEndpoint
        });
        console.log(`[API] Switched to Dummy API: ${updates.dummyApiEndpoint}`);
      } else if (!updates.useDummyApi) {
        configureApi({ useDummyApi: false, baseUrl: "https://graph.facebook.com/v19.0" });
        console.log(`[API] Switched to Facebook Graph API`);
      }
    }

    storage.updateConfig(updates);

    if (typeof pollIntervalMinutes !== "undefined") startCron();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/pages", (req, res) => {
  try {
    res.json(storage.getSourcePages());
  } catch (err) {
    res.status(500).json({ error: "Failed to get pages" });
  }
});

app.post("/api/pages", (req, res) => {
  try {
    const { id, name, token } = req.body;

    if (!id || !name) {
      return res.status(400).json({ error: "Page ID and Name are required" });
    }

    const trimmedId = String(id).trim();
    const trimmedName = String(name).trim();
    const trimmedToken = token ? String(token).trim() : "";

    if (trimmedId.length < 3) {
      return res.status(400).json({ error: "Page ID appears invalid" });
    }

    storage.addSourcePage({ id: trimmedId, name: trimmedName, token: trimmedToken });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/pages/:pageId", (req, res) => {
  try {
    const { pageId } = req.params;
    if (!pageId) return res.status(400).json({ error: "Page ID required" });
    storage.removeSourcePage(pageId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/pages/:pageId/toggle", (req, res) => {
  try {
    const { pageId } = req.params;
    const { active } = req.body;
    if (!pageId) return res.status(400).json({ error: "Page ID required" });
    storage.toggleSourcePage(pageId, !!active);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/logs", (req, res) => {
  try {
    res.json(storage.getRepostLog());
  } catch (err) {
    res.status(500).json({ error: "Failed to get logs" });
  }
});

app.post("/api/poll", async (req, res) => {
  try {
    runPoller();
    res.json({ success: true, message: "Poll triggered" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/validate-token", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Token required" });
  try {
    const result = await validateToken(token);
    res.json(result);
  } catch (err) {
    res.status(500).json({ valid: false, error: "Validation failed" });
  }
});

app.get("*", (req, res) => {
  if (!req.session.authenticated) return res.redirect("/login.html");
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n🚀 FB AutoPoster running at http://localhost:${PORT}`);
  console.log(`🔐 Login required — default password: password`);
  console.log(`🔑 Change password: node src/auth.js`);
  console.log(`📁 Data stored in ./data/store.json`);
  console.log(`⏱  Polling every ${storage.getConfig().pollIntervalMinutes} minutes\n`);
});
