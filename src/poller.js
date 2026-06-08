const { getPagePosts, publishPost } = require("./facebook");
const storage = require("./storage");

let isRunning = false;
const pollerStatus = { lastRun: null, nextRun: null, running: false, logs: [] };

function log(msg, type = "info") {
  const entry = { msg, type, time: new Date().toISOString() };
  pollerStatus.logs.unshift(entry);
  if (pollerStatus.logs.length > 50) pollerStatus.logs.pop();
  console.log(`[${type.toUpperCase()}] ${msg}`);
}

async function pollPage(page, config) {
  try {
    log(`Checking page: ${page.name} (${page.id})`);
    const posts = await getPagePosts(page.id, page.token);

    if (!posts || posts.length === 0) {
      log(`No posts found for ${page.name}`, "warn");
      return;
    }

    const latestPost = posts[0];

    // No new post
    if (page.lastPostId === latestPost.id) {
      log(`No new post on ${page.name}`);
      return;
    }

    // Skip very first run to avoid reposting old content (optional: remove if you want)
    if (!page.lastPostId) {
      log(`First run for ${page.name} — saving post ID without reposting`);
      storage.updateLastPostId(page.id, latestPost.id);
      return;
    }

    log(`New post detected on ${page.name}: ${latestPost.id}`, "success");

    // Extract content
    const message = latestPost.message || latestPost.story || "";
    const imageUrl = latestPost.full_picture || null;

    // Repost to target page
    const result = await publishPost(config.targetPageId, config.targetPageToken, {
      message,
      imageUrl,
    });

    // Update stored last post ID
    storage.updateLastPostId(page.id, latestPost.id);

    // Log the repost
    storage.addRepostLog({
      sourcePageId: page.id,
      sourcePageName: page.name,
      sourcePostId: latestPost.id,
      targetPostId: result.id || result.post_id,
      message: message.substring(0, 100),
      hasImage: !!imageUrl,
      status: "success",
    });

    log(`Reposted successfully from ${page.name} → target page`, "success");
  } catch (err) {
    const errorMsg = err.response?.data?.error?.message || err.message;
    log(`Error polling ${page.name}: ${errorMsg}`, "error");
    storage.addRepostLog({
      sourcePageId: page.id,
      sourcePageName: page.name,
      status: "error",
      error: errorMsg,
    });
  }
}

async function runPoller() {
  if (isRunning) {
    log("Poller already running, skipping cycle", "warn");
    return;
  }

  isRunning = true;
  pollerStatus.running = true;
  pollerStatus.lastRun = new Date().toISOString();
  log("--- Poller cycle started ---");

  try {
    const config = storage.getConfig();

    if (!config.targetPageId || config.targetPageId === "YOUR_TARGET_PAGE_ID") {
      log("Target page not configured. Please set it in Settings.", "error");
      return;
    }

    const pages = storage.getSourcePages().filter((p) => p.active);

    if (pages.length === 0) {
      log("No active source pages to monitor");
      return;
    }

    for (const page of pages) {
      await pollPage(page, config);
    }

    log("--- Poller cycle complete ---");
  } catch (err) {
    log(`Poller crash: ${err.message}`, "error");
  } finally {
    isRunning = false;
    pollerStatus.running = false;
  }
}

function getStatus() {
  return pollerStatus;
}

module.exports = { runPoller, getStatus };
