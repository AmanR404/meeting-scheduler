# Setup Guide — Things to Arrange Before Development

Follow each section in order. At the end of every section there's a **"➡️ Give me this"** box listing the exact values to send me. They all go into one `.env` file later.

> Tip: Create a plain text note and paste each value into it as you go. Don't share secrets in screenshots — just paste the values.

---

## 1. Google Workspace Trial (for real attendance tracking)

Personal Gmail can't expose Meet attendance (who joined, when, for how long). A Workspace account can, via the Admin Reports API. The free trial gives us this for 14 days — enough to build and demo.

**Steps:**

1. Go to https://workspace.google.com/ → click **Start Free Trial**.
2. Enter a business name (anything, e.g. "Meeting Scheduler Demo"), number of employees: **Just you**, region: your country.
3. Enter your contact name + an existing email.
4. When asked about a domain:
   - If you own a domain, use it.
   - If not, choose **"I'll use a domain I'll buy later"** or pick the option to get a temporary one. (You can also buy a cheap domain, but not required for the trial.)
5. Create your admin username, e.g. `admin@yourdomain` — **this is your Workspace admin account**.
6. Add a payment method (required for trial; you won't be charged during the 14 days — set a reminder to cancel if you don't want to continue).
7. Finish setup. You now have a **Google Workspace Admin Console** at https://admin.google.com.

> ⚠️ Important: Use **this Workspace account** (the `admin@yourdomain` one) for everything below — the Cloud project, OAuth, and login during testing. Don't mix it with your personal Gmail.

**➡️ Give me this:**
- Your Workspace admin email: `admin@yourdomain`
- Confirmation the Admin Console at admin.google.com opens for you

---

## 2. Google Cloud Project + Enable APIs

This is where OAuth and the Google APIs live.

**Steps:**

1. Go to https://console.cloud.google.com/ (sign in with the **Workspace admin** account from Section 1).
2. Top bar → project dropdown → **New Project**. Name it `meeting-scheduler` → **Create**. Select it.
3. Go to **APIs & Services → Library** and enable each of these (search the name, click it, click **Enable**):
   - **Google Calendar API**
   - **Gmail API**
   - **Admin SDK API** (this is the one that gives attendance reports)
   - **Google People API** (for profile info)

**➡️ Give me this:**
- Your Google Cloud **Project ID** (shown in the project dropdown / dashboard)

---

## 3. OAuth Consent Screen

This is the "Continue with Google" permission screen users see.

**Steps:**

1. **APIs & Services → OAuth consent screen**.
2. User type: choose **Internal** (works because you have Workspace — simplest, no verification needed). If "Internal" is greyed out, choose **External** and we'll add test users.
3. Fill in: App name `Meeting Scheduler`, user support email = your admin email, developer contact email = your admin email. Save.
4. **Scopes** → Add the following (click "Add or Remove Scopes", paste these):
   ```
   openid
   email
   profile
   https://www.googleapis.com/auth/calendar
   https://www.googleapis.com/auth/calendar.events
   https://www.googleapis.com/auth/gmail.send
   ```
   Save.
5. If you picked **External** in step 2: under **Test users**, add your admin email (and any other accounts you'll log in with during testing). Save.

**➡️ Give me this:**
- Which user type you chose (Internal or External)

---

## 4. OAuth Credentials (Client ID + Secret) — the important one

**Steps:**

1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Application type: **Web application**. Name: `meeting-scheduler-web`.
3. **Authorized JavaScript origins** — add:
   ```
   http://localhost:3000
   ```
4. **Authorized redirect URIs** — add both:
   ```
   http://localhost:3000/api/auth/callback/google
   http://localhost:5000/api/auth/google/callback
   ```
   (I'll confirm the exact one once the code is scaffolded; having both is fine.)
5. Click **Create**. A popup shows your **Client ID** and **Client Secret**. Copy both.

**➡️ Give me this:**
- `GOOGLE_CLIENT_ID` = `...`
- `GOOGLE_CLIENT_SECRET` = `...`

---

## 5. Service Account (for reading attendance reports)

The Admin Reports API is read with a service account that impersonates the admin.

**Steps:**

1. **APIs & Services → Credentials → Create Credentials → Service account**.
2. Name: `attendance-reader` → Create and Continue → skip roles → Done.
3. Click the new service account → **Keys** tab → **Add Key → Create new key → JSON**. A `.json` file downloads. **Keep it safe — this is a secret.**
4. On the service account's **Details** page, copy its **Unique ID** (a long number, the "Client ID").
5. Enable domain-wide delegation: in the Admin Console (admin.google.com) → **Security → Access and data control → API controls → Domain-wide delegation → Add new**:
   - Client ID = the service account's Unique ID from step 4
   - OAuth scopes:
     ```
     https://www.googleapis.com/auth/admin.reports.audit.readonly
     ```
   - Authorize.

**➡️ Give me this:**
- The downloaded **service account JSON file** (place it in the project folder; I'll tell you where)

> If Workspace setup turns out to be a hassle, tell me — I'll build app-based attendance (Join button + heartbeat) as a fallback and we skip this section.

---

## 6. MongoDB (database) — Atlas free tier

**Steps:**

1. Go to https://www.mongodb.com/cloud/atlas → sign up (free).
2. Create a **free M0 cluster** (pick any cloud/region near you).
3. **Database Access → Add New Database User**: username + password (save these).
4. **Network Access → Add IP Address → Allow Access from Anywhere** (`0.0.0.0/0`) — fine for development.
5. **Database → Connect → Drivers → Node.js** → copy the connection string. It looks like:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/meeting_scheduler?retryWrites=true&w=majority
   ```
   Replace `<user>` and `<password>` with what you set in step 3.

**➡️ Give me this:**
- `MONGODB_URI` = the full connection string

---

## 7. Email Sending — pick ONE option

**Option A — Gmail SMTP (easiest, free):**
1. On your Google account → **Manage your Google Account → Security → 2-Step Verification** (must be ON).
2. Then **App passwords** → create one named `meeting-scheduler` → copy the 16-character password.

➡️ Give me: `EMAIL_USER` = your email, `EMAIL_APP_PASSWORD` = the 16-char password

**Option B — SendGrid (better for "production-grade"):**
1. https://sendgrid.com → sign up free (100 emails/day).
2. **Settings → API Keys → Create API Key** (Full Access) → copy it.
3. **Settings → Sender Authentication** → verify a single sender email.

➡️ Give me: `SENDGRID_API_KEY` = `...`, `SENDGRID_FROM_EMAIL` = verified sender

> I recommend **Option A** for speed. We can switch later.

---

## 8. Redis (for scheduled reminders) — I handle this

Reminders (24h/1h/15min) run on a Redis-backed job queue. **You don't need to set this up** — it runs automatically inside Docker locally. Nothing for you here unless we deploy to cloud, in which case I'll point you to a free Redis Cloud tier.

---

## 9. GitHub Repository

**Steps:**

1. Go to https://github.com → **New repository**.
2. Name: `meeting-scheduler` (or your choice). Visibility: **Public** (required by the task).
3. **Don't** initialize with README/gitignore — I'll generate those.
4. Copy the repo URL.

**➡️ Give me this:**
- The repo URL, e.g. `https://github.com/yourname/meeting-scheduler`
- Confirm whether you want **me to prepare everything and you push**, or you want commit-by-commit guidance.

---

## Final checklist — everything I'll need

| # | Item | From section |
|---|------|--------------|
| 1 | Workspace admin email | 1 |
| 2 | Google Cloud Project ID | 2 |
| 3 | OAuth Client ID | 4 |
| 4 | OAuth Client Secret | 4 |
| 5 | Service account JSON file | 5 |
| 6 | MongoDB connection string | 6 |
| 7 | Email credentials (Option A or B) | 7 |
| 8 | GitHub repo URL | 9 |

Once you have these, send them over and we start Phase 1 (project scaffold) immediately.

> Security note: treat the Client Secret, service account JSON, MongoDB password, and email/API keys as passwords. They'll live only in `.env` (never committed — I'll set up `.gitignore` and a safe `.env.example`).
