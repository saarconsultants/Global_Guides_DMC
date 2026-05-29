# Global Guides — Step-by-Step Test Deployment

> **Who this is for:** you (Bipin) — a designer, not a coder. This guide assumes zero command-line experience. Every step says exactly what to click, what to type, and what you should see on screen before moving on.
>
> **Goal:** by the end you'll have a URL like `https://global-guides-platform.vercel.app` that your teammates can open from any phone or laptop in India and start testing.
>
> **Time:** ~45 minutes (or ~70 min if you've never used GitHub before).
> **Cost:** ₹0/month — Vercel Hobby tier + Neon Free tier covers everything for internal testing.
>
> **Read this once, top-to-bottom, before doing anything.** Then start at Step 0 and don't skip.

---

## Glossary (for when a word looks scary)

| Term | Plain English |
|---|---|
| **Repo / Repository** | A folder of code stored on GitHub. Like Google Drive, but for code. |
| **GitHub** | Where the code lives. The "cloud Google Drive" for code. |
| **Neon** | The database service. Where every login, lead, proposal, etc. is saved. |
| **Vercel** | The hosting service. It runs the actual website your teammates will visit. |
| **Postgres** | The type of database we use. (You won't touch it directly.) |
| **Env var / Environment variable** | A secret value (like a password) that the app needs to run but should never be in code. You'll set ~5 of these in Vercel. |
| **Deploy** | Push the latest code to the live site. Vercel does this automatically every time we update GitHub. |
| **Build** | Vercel compiles the code into something a browser can read. Takes ~3 min. |
| **Terminal** | The black window where you type commands. On Mac it's an app called "Terminal" — `Cmd + Space`, type "Terminal", hit Enter. |
| **CIDR / IP whitelist** | List of internet addresses that an API allows traffic from. Tripjack uses this to block strangers. |

---

## Step 0 — Pre-flight checklist (5 min)

Before opening any websites, confirm you have all of these. If any are ❌, fix that one before continuing.

- ✅ **A GitHub account** with your email confirmed. If not: https://github.com/join — takes 2 minutes.
- ✅ **Terminal app open**, sitting at the project folder.
  - **How:** open Terminal, then paste this and press Enter:
    ```bash
    cd "/Users/bipin/Global Guides/nexus-clone"
    pwd
    ```
  - You should see this printed back:
    ```
    /Users/bipin/Global Guides/nexus-clone
    ```
  - If you see something different, the project isn't where this guide expects it. Stop and ping me.
- ✅ **Chrome (or any browser) open** in a separate window, so you can flip between Terminal and the websites.
- ✅ **Notes app open**. You'll be copying ~5 strings (connection strings, passwords, URLs) and you don't want to lose them.
- ✅ **45 uninterrupted minutes**. The deploy step takes ~3 min of waiting and Neon's signup has a few "click confirm in email" gates. Don't start during a meeting.

That's it. No credit card needed anywhere in this guide.

---

## Step 1 — Push the code to GitHub (10 min)

### 1A. Initialize git locally

In Terminal, paste this **one block** and press Enter:

```bash
cd "/Users/bipin/Global Guides/nexus-clone"
git init -b main
git add -A
git -c user.email="bipin@globalguidesdmc.com" -c user.name="Bipin" commit -m "Initial commit — Global Guides platform"
```

**What you should see:** a bunch of `create mode 100644 ...` lines scrolling past, then a final line like:
```
 162 files changed, 25000+ insertions(+)
```

If you see `fatal: not a git repository` or any red text — stop, ping me.

### 1B. Create the repo on GitHub

1. Open https://github.com/new in your browser.
2. **Repository name:** type `global-guides-platform` (exact spelling).
3. **Description:** "Global Guides DMC — B2B travel agent platform" (optional).
4. **Visibility:** click **Private** (the radio button, not Public).
5. **DO NOT** check any of "Add a README", "Add .gitignore", or "Choose a license". Leave all three unchecked. *(If you check them GitHub creates conflicting files, then your push in 1C will fail.)*
6. Click the green **Create repository** button at the bottom.

### 1C. Push the code

After clicking Create, GitHub shows a page titled *"Quick setup"*. Look for the section **"…or push an existing repository from the command line"**. It contains 3 lines that look like:

```
git remote add origin https://github.com/YOUR-USERNAME/global-guides-platform.git
git branch -M main
git push -u origin main
```

Copy those exact 3 lines (with **your** username, not "YOUR-USERNAME"), paste them into Terminal, press Enter.

**What you'll see:**
- GitHub may pop up a browser window asking you to log in / authorize git. Click through it.
- Then in Terminal you'll see lines like `Enumerating objects: 350`, `Counting objects: 100%`, ending in `Branch 'main' set up to track 'origin/main'`.

**Verify:** refresh the GitHub page. You should now see all your files listed. If you see "global-guides-platform" with a green "Code" button — ✅ Step 1 done.

**Common gotcha:** if the push fails with `Authentication failed`, GitHub now requires a Personal Access Token instead of your password. Easiest fix: install **GitHub Desktop** (https://desktop.github.com/), drag the project folder onto it, click "Publish repository". It handles auth for you. Then come back to Step 2.

---

## Step 2 — Create the Postgres database on Neon (8 min)

### 2A. Sign up

1. Open https://neon.tech in a new tab.
2. Click **Sign Up** (top right).
3. Choose **Continue with GitHub** — fastest, no separate password to remember.
4. GitHub will ask "Authorize Neon" — click the green Authorize button.
5. Neon may ask a few onboarding questions (your role, team size). Pick anything sensible — doesn't affect the free tier.

### 2B. Create the project

After signup, Neon shows a "Create your first project" form (or a green **+ New Project** button if you skipped onboarding).

| Field | What to enter |
|---|---|
| **Project name** | `global-guides` |
| **Postgres version** | leave the default (the latest, e.g. 16 or 17) |
| **Cloud provider** | AWS |
| **Region** | **Singapore (ap-southeast-1)** — this is the closest Neon region to India. **Important** — don't pick a US region or your queries will be slow. |
| **Database name** | leave as `neondb` (the default) |

Click **Create project**.

### 2C. Copy the connection string

You'll land on a page titled "Connection Details" with a big code box.

1. Look for a toggle that says **Pooled connection** or **Connection pooling**. Turn it **ON** (it's important — without it the app may run out of database connections under load).
2. Find the connection string box. It looks like:
   ```
   postgresql://neondb_owner:abc123XYZ@ep-snowy-river-12345-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
   *(Yours will have different random characters.)*
3. Click the **Copy** icon next to it.
4. **Paste it into your Notes app** with a label "DATABASE_URL — Neon". You'll need it in Step 3.

**Verify:** if the string starts with `postgresql://` and ends with `?sslmode=require`, you're good. If it doesn't end with `?sslmode=require`, add that to the end manually.

---

## Step 3 — Generate the SESSION_PASSWORD (1 min)

This is the secret key that encrypts the login cookie. It must be at least 32 characters of random gibberish.

In Terminal, paste this and press Enter:

```bash
openssl rand -base64 48
```

**What you'll see:** a single line of random characters, like:
```
hT8q7m+Pz3aXkL5VnB2YwC4dEf9GhJ1kM6nP0qR8sT3uV5wX7yZ9aB2cD4fG6hJ8
```

Copy that whole line into your Notes app, label it "SESSION_PASSWORD".

> ⚠️ **Don't reuse a password you've used elsewhere.** Use the output of `openssl rand` exactly as-is. Anyone who gets this string can forge logins.

---

## Step 4 — Deploy on Vercel (15 min)

### 4A. Sign up

1. Open https://vercel.com/signup in a new tab.
2. Click **Continue with GitHub**.
3. Click **Authorize Vercel** on the GitHub popup.
4. Vercel asks about plan — pick **Hobby (Free)**. It also asks for a team name — type your name (e.g. "Bipin") and click Continue.

### 4B. Import the repo

1. After signup you land on a dashboard. Click the big **+ Add New...** button (top right) → **Project**.
2. You'll see a list of your GitHub repos. Find **global-guides-platform** and click the **Import** button next to it.
   - *If you don't see it:* click "Adjust GitHub App Permissions" or "Configure GitHub App", grant Vercel access to that repo, come back.

### 4C. Configure the project

You'll see a "Configure Project" page. Most defaults are correct because we have a `vercel.json` in the repo — **do not change** Framework Preset, Root Directory, Build Command, or Output Directory. Vercel auto-fills them correctly.

Scroll down to **Environment Variables**. This is the important part.

**Add these four** one at a time. For each: type the **Name** in the left box, paste the **Value** in the right box, click **Add**.

| Name | Value | Where it comes from |
|---|---|---|
| `DATABASE_URL` | the Neon connection string | Step 2C, in your Notes app |
| `SESSION_PASSWORD` | the openssl output | Step 3, in your Notes app |
| `NEXT_PUBLIC_APP_URL` | leave **blank for now** | We'll set this after we have a domain |
| `ANTHROPIC_API_KEY` | your Anthropic API key, **or leave blank** | If blank, AI Suggester returns a fallback message — that's fine for testing |

> 💡 **Skip `NEXT_PUBLIC_APP_URL` entirely for now** — Vercel will use the auto-generated `.vercel.app` URL by default, and that works.

### 4D. Deploy

Click the big **Deploy** button at the bottom.

**What happens next:**
1. Vercel shows a loading screen with a confetti animation and three steps progressing: *"Building → Deploying → Ready"*.
2. The build runs your code through:
   - `npm install` (downloads dependencies) — ~60s
   - `prisma generate && prisma db push` (creates all tables in your Neon database for the first time) — ~30s
   - `next build` (compiles the app) — ~90s
3. **Total: ~3 minutes.** Don't close the tab.

**Verify success:** when done you'll see a confetti animation and a **"Congratulations!"** message. Just below is your live URL — something like `https://global-guides-platform-abc123.vercel.app`.

**Copy that URL** into your Notes app — this is the staging URL you'll share with teammates.

### 4E. Open the site

Click **Continue to Dashboard**. Then click the big screenshot preview, or click **Visit** — opens your site in a new tab.

You should see the **Login** page with the Global Guides logo. ✅ Step 4 done.

**If the build failed**, click **View Build Logs** in Vercel. The most common errors:

| Error in log | What it means | Fix |
|---|---|---|
| `Can't reach database server` | DATABASE_URL is wrong or Neon is down | Re-copy from Neon, make sure it ends in `?sslmode=require`, re-paste in Vercel env vars, redeploy |
| `SESSION_PASSWORD must be at least 32 characters` | Your session secret is too short | Re-run `openssl rand -base64 48`, re-paste |
| `Cannot find module '@gg/tripjack'` | Workspace install issue | Ping me — this is a build config problem, not user-fixable |
| build hangs at "next build" for >10 min | Vercel free tier hit a memory cap | Click "Redeploy" and try again; usually transient |

---

## Step 5 — Create your account & promote yourself to super-admin (5 min)

### 5A. Sign up

1. On your live site, click **Sign Up** (or go to `https://YOUR-URL/signup`).
2. Fill in:
   - **Agency name:** "Global Guides DMC" (this becomes the platform tenant — pick the real name now, it shows on customer-facing pages)
   - **Your name:** "Bipin"
   - **Email:** your real work email
   - **Password:** anything strong (you can use a password manager)
3. Click **Create account**. You'll land on the dashboard.

### 5B. Promote yourself to SUPER_ADMIN

By default new signups are `AGENCY_OWNER` (they can run an agency, but they can't see the platform-wide admin shell). To see `/admin` (Bug reports, Agencies, Commission rules), you need `SUPER_ADMIN`.

1. Open Neon (the tab from Step 2) → in the left sidebar click **SQL Editor**.
2. Paste this query, replacing the email with the exact one you signed up with:
   ```sql
   UPDATE "User" SET role = 'SUPER_ADMIN' WHERE email = 'YOUR_EMAIL@example.com';
   ```
3. Click **Run** (green button, top right).

**What you'll see:** `UPDATE 1` in the results panel. That means 1 row was updated — you. If it says `UPDATE 0`, the email didn't match — check for typos.

### 5C. Verify

1. Back in your app tab, click your profile (top right) → **Log out**.
2. Log back in with the same email & password.
3. Now you should see an **Admin** option in the top-right menu, leading to `/admin` with sidebar items: Overview · Agencies · Templates · Commission rules · Revenue ledger · **Bug reports**.

✅ Step 5 done. You can now triage bug reports your teammates file.

---

## Step 6 — Invite teammates (3 min)

Two ways:

### Easy: hand them the signup URL
Share `https://YOUR-URL/signup`. They create their own account, which puts them in **their own agency**. Good if they're going to act as independent travel agencies in test.

### Proper: invite them to your agency
1. In your app, go to **Settings → Team**.
2. Click **+ Invite teammate**.
3. Enter their email, pick role (COUNSELLOR for testers).
4. Copy the invite link that appears, send it to them via WhatsApp/email.
5. They click the link, set a password, and they're inside your agency with proper role-based access.

---

## Step 7 — Tripjack live flights (separate 2-3 day track, do in parallel)

Tripjack requires whitelisting outbound IPs. Vercel uses dynamic IPs that change per request. Three options, easiest first:

### Option A — Ask Tripjack to whitelist Vercel's IP ranges (1-2 days)

Email `support@tripjack.com`:

> Subject: IP whitelist request for User ID 113003
>
> Hi team,
>
> We've deployed our staging integration on Vercel (regions: US East + Singapore + Mumbai). Their outbound traffic comes from the CIDR ranges published at https://vercel.com/docs/edge-network/regions
>
> Please whitelist these ranges for User ID 113003 (Global Guides DMC LLP) so we can complete UAT.
>
> Thanks,
> Bipin

If they approve:
1. Go to Vercel → your project → **Settings → Environment Variables**.
2. Add `TRIPJACK_BASE_URL` = `https://apitest.tripjack.com`
3. Add `TRIPJACK_API_KEY` = your actual key
4. Click **Redeploy** on the latest deployment.

Done. Flight search now hits Tripjack live.

### Option B — Fixed-IP proxy on DigitalOcean ($5/mo)

If Tripjack won't whitelist Vercel's wide IP ranges, the cheapest fallback is a one-line proxy server with a static IP.

1. Sign up at https://digitalocean.com (₹400/mo basic Droplet).
2. Create a Droplet — Region: Bangalore — Size: Basic $5 (1GB RAM).
3. Tell me the Droplet's IP — I'll give you a Dockerfile + one config line to deploy a proxy on it.
4. Whitelist *that one IP* with Tripjack.
5. Set `TRIPJACK_BASE_URL` in Vercel to the proxy URL.

### Option C — Stay on mock data (recommended for week 1)

The app falls back to realistic mock flight results when the Tripjack key isn't set. UX is identical. Teammates can test every screen end-to-end. Only "live fares" are missing.

---

## Step 8 — Slack alerts for new bug reports (OPTIONAL, 3 min)

Every time a teammate files a bug, ping a Slack channel instantly.

1. Open Slack → click your workspace name (top-left) → **Settings & administration → Manage apps**.
2. Search for **Incoming Webhooks** → click → **Add to Slack**.
3. Pick a channel (create `#gg-bugs` first if you want a dedicated one).
4. Click **Add Incoming Webhooks integration** → Slack shows a webhook URL like `https://hooks.slack.com/services/T00000/B00000/abc123`.
5. Copy it.
6. Vercel → your project → **Settings → Environment Variables** → add `SLACK_BUG_WEBHOOK` = *the URL above*.
7. Click **Redeploy**.

Now every bug report fires a message in Slack with severity emoji, title, reporter, page URL.

---

## How updates work from here on

You don't deploy manually anymore. Whenever I push code to GitHub:

1. I commit + push to GitHub `main`.
2. Vercel auto-detects the push within 30 seconds.
3. Build runs (~90 seconds).
4. Your live URL serves the new version. Your teammates see updates without re-installing anything.

That's it. No "publish" button to click. Push = live.

### What you do daily

- **Check `/admin/bug-reports`** once a day. Triage with the dropdown (OPEN → IN_PROGRESS → FIXED) and a one-line note. I work off this list when fixing bugs.
- **Read Slack** if you wired Step 8. Every Blocker/High severity ping is something I should know about immediately.

---

## How testers report bugs (so you can train your team)

Tell your teammates this in WhatsApp:

> **How to report bugs in the Global Guides platform:**
>
> 1. When you hit a bug, click the dark **Report** button at the bottom-right of every page (or press **Cmd+Shift+B** on Mac / **Ctrl+Shift+B** on Windows).
> 2. Pick a severity:
>    - **Low** — cosmetic / nice-to-fix
>    - **Medium** — annoying but I can work around it
>    - **High** — blocks me from finishing a flow
>    - **Blocker** — platform unusable for me right now
> 3. Pick a category (Bug / UX / Data / Performance / Feature request / Other).
> 4. Write a one-line summary + step-by-step description ("I went here, clicked this, expected X, got Y").
> 5. Click **Send report**. We see it instantly.
> 6. If you have a screenshot, drop it in WhatsApp afterwards with the time you reported — we'll match them up.
>
> Uncaught crashes auto-report themselves with the full error, so don't worry about those.

---

## Things that work / don't work in test

| Item | Status | Notes |
|---|---|---|
| Login / signup / multi-tenant agencies | ✅ Live | |
| AI Itinerary Suggester | ✅ Live (if `ANTHROPIC_API_KEY` set) | Graceful fallback if not |
| Itinerary builder, customize, save, share | ✅ Live | |
| Customer-facing share pages `/p/[token]` | ✅ Live | White-label per agency |
| Flight search | ⚠️ Mock until IP whitelist | UX identical |
| Hotel search | ⚠️ Mock | 1,400+ properties with real city/star/price |
| Wallet recharge | ❌ Razorpay not wired | Credit manually via Neon SQL: `UPDATE "Agency" SET "walletPaise" = 500000000 WHERE code = '…';` |
| Lead-gen widget embed | ✅ Live | Share `/widget/{your-agency-slug}` |
| Email notifications | ❌ No SMTP yet | Bell + Slack cover most |
| PDF flyer (Marketing → Download) | ✅ Live | |
| CSV exports (statement, revenue) | ✅ Live | |
| Bug reporter | ✅ Live | Floating button + Cmd/Ctrl+Shift+B |
| Drag-reorder destinations | ✅ Live | |
| Per-agency markup + per-product overrides | ✅ Live | |
| Admin commission rules | ✅ Live | |

---

## When something goes wrong on the deployed site

| Symptom | First check |
|---|---|
| Site shows "Application error: a server-side exception" | Open `https://YOUR-URL/api/health`. If it returns 503, Neon is down — check Neon's dashboard. |
| Deploy failed in Vercel | Vercel → Deployments → click the red one → see logs. 90% of failures are env-var typos. |
| Schema out of sync (Prisma error in logs) | Vercel → Deployments → "..." menu → **Redeploy** with **"Use existing build cache" UNCHECKED**. The build re-runs `prisma db push`. |
| Locked out / forgot password | Send me the email address — I'll generate a fresh bcrypt hash and you run one SQL query in Neon. |
| Teammate can't log in | Check `User` table in Neon: `SELECT email, role, "agencyId" FROM "User" WHERE email = '…';` — make sure the row exists and has the right agency. |
| Want to wipe all test data and start fresh | Neon → SQL Editor: `TRUNCATE "Proposal", "Lead", "BugReport", "WalletTxn", "CommissionEntry", "Notification" CASCADE;` (this keeps users + agencies intact but clears all transactional data) |

---

## Custom domain (when ready, not now)

Once you're happy with the test URL, you can swap to a real domain.

1. Buy a domain at GoDaddy / Namecheap / Cloudflare. Suggested: `test.globalguidesdmc.com` for staging, `app.globalguidesdmc.com` for prod.
2. Vercel → your project → **Settings → Domains → Add**.
3. Vercel gives you DNS records (CNAME or A) to add at your domain registrar.
4. Add them at GoDaddy/etc — propagation takes 5-30 min.
5. Vercel auto-issues a free SSL cert. Your URL is now `https://test.globalguidesdmc.com`.
6. Update `NEXT_PUBLIC_APP_URL` in Vercel to the new URL → Redeploy (so the lead-widget snippet generator uses the right host).

---

## Your checklist (do this in order)

- [ ] Step 0 — Pre-flight (Terminal open, GitHub account, 45 free min)
- [ ] Step 1 — Push code to GitHub
- [ ] Step 2 — Neon: create project, copy connection string
- [ ] Step 3 — Generate SESSION_PASSWORD via `openssl rand -base64 48`
- [ ] Step 4 — Vercel: import repo, paste env vars, deploy, copy live URL
- [ ] Step 5 — Sign up on the live site, promote yourself to SUPER_ADMIN via Neon SQL
- [ ] Step 6 — Invite teammates
- [ ] Step 7 — (background) Email Tripjack about IPs
- [ ] Step 8 — (optional) Wire Slack webhook

**When Step 4 is done, paste me the live URL.** I'll smoke-test every flow before you hand it to teammates.
