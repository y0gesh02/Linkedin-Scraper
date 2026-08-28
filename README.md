# 🚀 LinkedIn Profile Scraper API

A lightweight, fast, and browserless Fastify + TypeScript API that takes any public LinkedIn profile URL and returns structured, clean JSON data.

⚡ **No Puppeteer. No Selenium. No Headless Chrome.**
Instead of spinning up heavy browsers that eat gigabytes of RAM, this service directly calls LinkedIn's internal web API (_Voyager API_) using lightweight HTTP requests with a real session cookie. It’s fast, reliable, and uses minimal resources.

---

## ✨ Features

- ⚡ **Blazing Fast**: Directly fetches JSON from LinkedIn instead of rendering web pages.
- 🎯 **Rich Structured Data**: Extracts headline, summary, work experience, education, skills, certifications, languages, follower count, profile & banner pictures.
- 🛡️ **Smart Anti-Bot Protection**: Built-in rate limiting (20 req/min) and random human-like jitter to keep your account safe.
- 💾 **Built-in Caching**: Redis support with automatic in-memory fallback (24-hour cache TTL).
- 🧩 **Graceful Degradation**: If one section (e.g. certifications) fails or changes shape, the rest of the profile still parses successfully.
- 🖥️ **Interactive Web UI & Docs**: Built-in test console at `/` and interactive Swagger/Scalar API docs at `/docs`.

---

## 🚀 Quick Start in 3 Steps

### 1. Prerequisites

- **Node.js 22+** installed on your machine.
- A **throwaway LinkedIn account** (recommended so your primary personal account is never at risk).

---

### 2. Clone & Install

```bash
# Clone the repository
git clone <your-repo-url>
cd Linkedin_Scraper

# Install dependencies
npm install
```

---

### 3. Get LinkedIn Cookies & Start

You only need **two cookies** from LinkedIn to authenticate requests:

1. Open an incognito/private browser window and log into your throwaway LinkedIn account.
2. Press `F12` (or right-click → **Inspect**) to open Developer Tools.
3. Go to the **Application** tab (Chrome/Edge) or **Storage** tab (Firefox) → **Cookies** → `https://www.linkedin.com`.
4. Copy the value of `li_at`.
5. Copy the value of `JSESSIONID` (keep the double quotes, e.g. `"ajax:1234567890123456789"`).
6. Create your `.env` file from the template:

```bash
cp .env.example .env
```

7. Paste your cookies into `.env`:

```dotenv
LI_AT=AQEDAW1FBvcD...your_li_at_cookie...
JSESSIONID="ajax:123456789"
API_KEY=my-secret-key
```

> **Important**: Do not log out of LinkedIn in that browser window, as logging out invalidates your `li_at` cookie on LinkedIn's servers. Just close the tab.

8. **Start the development server**:

```bash
npm run dev
```

Your API is now running at **`http://localhost:4321`**! 🎉

---

## 🎮 Try it Out

### Option A: Interactive Web UI (Easiest)

Open your browser and visit:
👉 **`http://localhost:4321`**

Paste any LinkedIn profile URL and see the live JSON response immediately!

### Option B: Interactive API Reference

Explore endpoints and try out requests in the interactive API documentation:
👉 **`http://localhost:4321/docs`**

### Option C: cURL / Terminal

```bash
curl -X POST "http://localhost:4321/api/v1/profile" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: my-secret-key" \
  -d '{"url": "https://www.linkedin.com/in/williamhgates"}'
```

---

## ⚙️ Configuration (`.env`)

The project is pre-configured with safe, sensible defaults so you only need to provide authentication keys:

| Variable     |  Required  | Description                                                                                 |
| :----------- | :--------: | :------------------------------------------------------------------------------------------ |
| `LI_AT`      |  **Yes**   | LinkedIn session authentication cookie.                                                     |
| `JSESSIONID` |  **Yes**   | LinkedIn CSRF security cookie (with quotes).                                                |
| `API_KEY`    | _Optional_ | Secret key required in the `X-API-Key` header. If left empty, the API is open.              |
| `REDIS_URL`  | _Optional_ | Redis connection string (e.g. `redis://localhost:6379`). If empty, uses an in-memory cache. |

_(Built-in defaults such as server port `4321`, 20 requests/minute rate limits, and 24h cache TTL are managed in `src/config/constants.ts`)._

---

## 📦 API Reference

### 1. Fetch Profile

**`POST /api/v1/profile`**

**Headers**:

- `X-API-Key: <your-api-key>` (if `API_KEY` is set in `.env`)
- `Content-Type: application/json`

**Request Body (POST)**:

```json
{
  "url": "https://www.linkedin.com/in/williamhgates",
  "refresh": false
}
```

_(Set `"refresh": true` if you want to bypass the cache and fetch fresh data from LinkedIn)._

---

### 2. Sample Response

```jsonc
{
  "profileUrl": "https://www.linkedin.com/in/williamhgates",
  "publicIdentifier": "williamhgates",
  "urn": "urn:li:fsd_profile:ACoAAA...",
  "fetchedAt": "2026-08-28T12:00:00.000Z",
  "cached": false,

  "basics": {
    "firstName": "Bill",
    "lastName": "Gates",
    "fullName": "Bill Gates",
    "headline": "Co-chair, Bill & Melinda Gates Foundation",
    "summary": "Co-chair of the Bill & Melinda Gates Foundation...",
    "location": {
      "full": "Seattle, Washington, United States",
      "city": "Seattle",
      "country": "United States",
    },
    "followerCount": 35000000,
    "connectionCount": 500,
    "isPremium": false,
    "isOpenToWork": false,
  },

  "images": {
    "profilePicture": {
      "url": "https://media.licdn.com/dms/image/...",
      "width": 800,
      "height": 800,
    },
    "backgroundImage": {
      "url": "https://media.licdn.com/dms/image/...",
    },
  },

  "experience": [
    {
      "title": "Co-chair",
      "companyName": "Bill & Melinda Gates Foundation",
      "companyLinkedinUrl": "https://www.linkedin.com/company/gates-foundation",
      "location": "Seattle, WA",
      "startDate": { "month": 1, "year": 2000 },
      "endDate": null,
      "isCurrent": true,
      "durationMonths": 319,
    },
  ],

  "education": [
    {
      "schoolName": "Harvard University",
      "degreeName": "Honorary Doctorate",
      "startDate": { "year": 1973 },
      "endDate": { "year": 1975 },
    },
  ],

  "skills": [
    { "name": "Philanthropy", "endorsementCount": 99 },
    { "name": "Software Development", "endorsementCount": 99 },
  ],

  "certifications": [],
  "languages": [{ "name": "English", "proficiency": "Native or bilingual" }],

  "meta": {
    "sectionsParsed": [
      "basics",
      "images",
      "experience",
      "education",
      "skills",
      "languages",
    ],
    "sectionsFailed": [],
    "sourceEndpoint": "dashProfile",
  },
}
```

---

### 3. Health Check

**`GET /health`**

Returns service health and checks if the LinkedIn session credentials are functional:

```json
{
  "status": "ok",
  "sessionValid": true,
  "version": "1.0.0"
}
```

---

## 🛠️ Project Structure

```
src/
├── index.ts                # Application startup & graceful shutdown
├── server.ts               # Fastify server setup, Swagger docs, error handlers
├── cache.ts                # Redis cache with in-memory fallback
├── errors.ts               # Custom error classes and HTTP status mapping
├── config/
│   ├── constants.ts        # Built-in defaults (port, user-agent, rate limits)
│   ├── endpoints.ts        # LinkedIn Voyager API endpoint templates
│   └── env.ts              # Zod validation for runtime secrets
├── plugins/
│   ├── auth.ts             # API Key security verification
│   ├── linkedin.ts         # Injects LinkedIn client into Fastify
│   └── redis.ts            # Injects cache into Fastify
├── linkedin/
│   ├── urls.ts             # Extracts vanity ID from LinkedIn URLs
│   ├── session.ts          # Cookie and CSRF token manager
│   ├── client.ts           # Rate-limited HTTP client with retry logic
│   └── limiter.ts          # Bottleneck queue & human jitter generator
├── parsers/                # Pure parser functions for each profile section
├── schemas/                # Zod schemas for input validation & OpenAPI docs
└── services/
    └── profileService.ts   # Main orchestration logic
```

---

## 🧪 Available Scripts

| Command             | Action                                               |
| :------------------ | :--------------------------------------------------- |
| `npm run dev`       | Starts server in watch mode with instant reload.     |
| `npm run build`     | Compiles TypeScript into the `dist/` directory.      |
| `npm start`         | Runs the compiled production code from `dist/`.      |
| `npm test`          | Runs the offline Vitest test suite with MSW mocks.   |
| `npm run typecheck` | Verifies all TypeScript types without emitting code. |

---

## ⚠️ Responsible Use Disclaimer

- Automated data collection is subject to LinkedIn's [User Agreement](https://www.linkedin.com/legal/user-agreement).
- This project is designed strictly for **educational and evaluation purposes**.
- Always use a disposable/test account, observe polite request rates, and respect individual privacy.

---

## 📄 License

MIT License. Feel free to use and adapt for your own educational projects!
