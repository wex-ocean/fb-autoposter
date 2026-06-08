# 🚀 FB AutoPoster — Facebook Auto Reposting Automation
 
> A Node.js automation tool that monitors Facebook pages and auto-reposts new content to your target page using the Facebook Graph API.
 
![Node.js](https://img.shields.io/badge/Node.js-v18+-green?style=flat-square&logo=node.js)
![Express](https://img.shields.io/badge/Express-4.x-blue?style=flat-square&logo=express)
![Facebook API](https://img.shields.io/badge/Facebook-Graph%20API%20v19-1877F2?style=flat-square&logo=facebook)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)
 
---
 
## 📌 What It Does
 
FB AutoPoster monitors one or more Facebook pages for new posts and automatically reposts the content (text + images) to your own Facebook page — hands-free, on a set interval.
 
---
 
## ✨ Features
 
- 📄 Monitor multiple source Facebook pages
- 🔄 Auto-detect and repost new content
- 🖼️ Supports text and image posts
- 🚫 Duplicate post prevention (via stored post IDs)
- ⏱️ Configurable polling interval
- 📊 Clean dashboard UI
- 📋 Full repost activity log
---

## 🛠️ Tech Stack
 
| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Scheduler | node-cron |
| API | Facebook Graph API v19 |
| Storage | JSON file (no database needed) |
| Frontend | HTML + CSS + Vanilla JS |
 
---

## Project Structure

```
fb-autoposter/
├── server.js              # Express server + cron scheduler
├── package.json
├── src/
│   ├── facebook.js        # Facebook Graph API calls
│   ├── poller.js          # Polling engine
│   └── storage.js         # JSON file read/write
├── public/
│   └── index.html         # Dashboard UI
└── data/
    └── store.json         # App data (pages, config, logs)
```

## Setup & Run

### 1. Install dependencies
```bash
cd fb-autoposter
npm install
```

### 2. Start the server
```bash
npm start
# or for dev with auto-restart:
npm run dev
```

### 3. Open dashboard
```
http://localhost:3000
```

## Facebook API Setup

1. Go to https://developers.facebook.com → Create App
2. Add **Facebook Login** product
3. Request permissions:
   - `pages_read_engagement` (read source pages)
   - `pages_manage_posts` (post to target page)
4. Generate a **Page Access Token** via Graph API Explorer
5. Go to **Settings** tab in dashboard and paste your tokens

 
## 🔑 Facebook API Setup
 
### Required Permissions
 
| Permission | Purpose |
|---|---|
| `pages_read_engagement` | Read posts from source pages |
| `pages_manage_posts` | Publish posts to your target page |
| `pages_show_list` | List pages you manage |
 
### Getting Your Access Token
 
1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create a new App → choose **Business** type
3. Navigate to **Tools → Graph API Explorer**
4. Select your app and click **Generate Access Token**
5. Grant the required permissions listed above
6. Copy the token → paste it in the **Settings** tab of the dashboard
> **Note:** User tokens expire in ~1 hour. For a permanent token, generate a **Long-Lived Page Access Token** via the token debugger tool.

### Finding a Page ID
 
Use [lookup-id.com](https://lookup-id.com) — paste any Facebook page URL and get the numeric Page ID instantly.
 
---
 
## ⚙️ Configuration
 
All settings can be managed via the **Settings tab** in the dashboard or directly in `data/store.json`.
 
| Field | Description |
|---|---|
| `targetPageId` | Numeric ID of the page to repost to |
| `targetPageToken` | Page access token with `pages_manage_posts` |
| `pollIntervalMinutes` | How often to check for new posts (default: 5) |
 
---

## How It Works

1. Cron job fires every N minutes
2. For each active source page → fetch latest posts via Graph API
3. Compare latest post ID with stored `lastPostId`
4. If new post found → repost text + image to target page
5. Update stored `lastPostId` to prevent duplicates
6. Log the result

## Notes

- First run per page **saves** the latest post ID without reposting (avoids spam)
- Duplicate prevention via stored post IDs
- All logs visible in the Logs tab of the dashboard
