const fs = require("fs");
const path = require("path");

const STORE_PATH = path.join(__dirname, "../data/store.json");

function ensureStoreExists() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    const defaultStore = {
      config: {
        targetPageId: "",
        targetPageToken: "",
        pollIntervalMinutes: 5
      },
      sourcePages: [],
      repostLog: []
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(defaultStore, null, 2), "utf-8");
  }
}

function readStore() {
  ensureStoreExists();
  try {
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[STORAGE] Failed to read store: ${err.message}`);
    return {
      config: { targetPageId: "", targetPageToken: "", pollIntervalMinutes: 5 },
      sourcePages: [],
      repostLog: []
    };
  }
}

function writeStore(data) {
  ensureStoreExists();
  try {
    const tmpPath = `${STORE_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmpPath, STORE_PATH);
  } catch (err) {
    console.error(`[STORAGE] Failed to write store: ${err.message}`);
    throw err;
  }
}

function getConfig() {
  return readStore().config;
}

function updateConfig(updates) {
  const store = readStore();
  store.config = { ...store.config, ...updates };
  writeStore(store);
}

function getSourcePages() {
  return readStore().sourcePages;
}

function addSourcePage(page) {
  const store = readStore();
  const exists = store.sourcePages.find((p) => p.id === page.id);
  if (exists) throw new Error("Page already exists");
  store.sourcePages.push({
    ...page,
    active: true,
    lastPostId: null,
    addedAt: new Date().toISOString(),
  });
  writeStore(store);
}

function removeSourcePage(pageId) {
  const store = readStore();
  store.sourcePages = store.sourcePages.filter((p) => p.id !== pageId);
  writeStore(store);
}

function toggleSourcePage(pageId, active) {
  const store = readStore();
  const page = store.sourcePages.find((p) => p.id === pageId);
  if (page) page.active = active;
  writeStore(store);
}

function updateLastPostId(pageId, postId) {
  const store = readStore();
  const page = store.sourcePages.find((p) => p.id === pageId);
  if (page) page.lastPostId = postId;
  writeStore(store);
}

function addRepostLog(entry) {
  const store = readStore();
  store.repostLog.unshift({ ...entry, timestamp: new Date().toISOString() });
  if (store.repostLog.length > 100) store.repostLog = store.repostLog.slice(0, 100);
  writeStore(store);
}

function getRepostLog() {
  return readStore().repostLog;
}

module.exports = {
  readStore,
  writeStore,
  getConfig,
  updateConfig,
  getSourcePages,
  addSourcePage,
  removeSourcePage,
  toggleSourcePage,
  updateLastPostId,
  addRepostLog,
  getRepostLog,
};
