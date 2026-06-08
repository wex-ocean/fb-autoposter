# 🚀 FB AutoPoster — Facebook Auto Reposting Automation

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

## Configuration

Edit `data/store.json` directly or use the Settings UI:

| Field | Description |
|-------|-------------|
| `targetPageId` | Your Facebook Page ID to post to |
| `targetPageToken` | Page access token with manage_posts |
| `pollIntervalMinutes` | How often to check for new posts |

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
