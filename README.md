# Family Wall Planner

A portrait-first React, Vite, and Zustand PWA for a wall-mounted iPad Pro. It has a read-only family calendar, a local family needs list, and a daily school-prep routine.

## Design mockups

The AI-generated concepts used for the interface are in [`design/mockups`](design/mockups):

- [School Prep (revised)](design/mockups/school-prep-v2.png)
- [Calendar Today](design/mockups/calendar-today.png)
- [Calendar Week](design/mockups/calendar-week.png)
- [Needs and large keyboard](design/mockups/needs.png)

## Run locally

Use Node.js 24 or newer.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

On Windows PowerShell, copy the environment file with `Copy-Item .env.example .env.local` and use `npm.cmd` if the PowerShell execution policy blocks `npm`.

The calendar setup screen is shown until `VITE_GOOGLE_CLIENT_ID` is configured. Needs and School Prep work without Google setup.

## Connect Google Calendar

The app uses Google's browser-side OAuth token flow. It never needs a Google client secret.

1. In [Google Cloud Console](https://console.cloud.google.com/), create or select a project, enable the **Google Calendar API**, and configure the OAuth consent screen. If the app is in testing, add the family Google account as a test user.
2. Create an OAuth client of type **Web application**. Add `http://localhost:5173` and your deployed origin, such as `https://YOURNAME.github.io`, to **Authorized JavaScript origins**. Add a custom-domain origin too if you use one. Origins include the scheme and host, not the repository path.
3. Put the **client ID** in `.env.local` for local use:

   ```env
   VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
   ```

4. For GitHub Pages, set the repository **Actions variable** `GOOGLE_CLIENT_ID` to that same client ID. This value is public by design. Never put a client secret or a private calendar URL in the Vite environment or repository.
5. In the app, tap **Connect Google**, sign in as an account with access to the shared family calendar, and choose that calendar. The account must already have the family calendar in its Google Calendar list. A calendar ID can also be entered with the app's large keyboard.

Google's browser token model uses short-lived access tokens and [requires a user gesture to renew them](https://developers.google.com/identity/oauth2/web/guides/use-token-model). The board caches 14 days of events so the current week stays visible for several days when disconnected, and shows **Reconnect** to refresh. A completely unattended private-calendar refresh would require a separate trusted backend.

## Deploy on GitHub Pages

The workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds on pushes to `main` and deploys `dist`. In the repository's **Settings → Pages**, choose **GitHub Actions** as the build source.

The workflow sets Vite's base path from the repository name. For a custom domain, set the Actions variable `SITE_BASE_PATH` to `/`. Run `npm run build` locally to verify a production build. The root `deploy-gh-pages.yml` was supplied as an example; GitHub Actions uses the workflow under `.github/workflows`.

## Set up the wall iPad

1. Open the deployed site in Safari, use **Share → Add to Home Screen**, and enable **Open as Web App**. [Apple's iPad instructions](https://support.apple.com/guide/ipad/open-as-web-app-ipad8f1f7a29/ipados) show the current menu.
2. Open the installed planner, connect Calendar, and tap **Sound on** once if you want dings. iPad browsers require a tap before audio can play.
3. If you want the iPad restricted to the planner, enable **Guided Access** in iPad Settings → Accessibility and start a session in the installed app. Configure its display auto-lock option for the wall setup. [Apple's Guided Access guide](https://support.apple.com/guide/ipad/ipada16d1374/ipados) has the device steps.

The app opens School Prep on launch and switches back to it once each morning after 5:30 AM while the app is open. Routine checks reset by local calendar date. After 5 PM, School Prep shows tomorrow's list so clothes can be laid out the night before. The amber **NOW** marker moves through the deadline list. Overdue unfinished cards pulse slowly during the active morning. A brief three-pulse screen alert can be turned off; dings are off until enabled. Alerts depend on the app staying open and awake.

Needs, routine completion, alert preferences, the chosen calendar ID, and the most recently fetched 14 days of calendar events are stored in this browser's local storage. **Needs do not sync between devices**; family members can add and complete them on the wall iPad. The app shell is available offline, but Google events cannot refresh offline. Voice entry uses the browser's speech-recognition support and microphone permission; the large on-screen keyboard is always available.
