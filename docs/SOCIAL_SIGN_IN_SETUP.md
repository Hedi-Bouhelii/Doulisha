# Social sign-in: what you need to do

This phase adds **sign in with Google and Facebook**, a **"Mon compte → Moyens de connexion"** screen, **story sharing on phones**, and draft **Privacy / Terms / data deletion** pages (ADR 0019). Claude writes all the code, tests and documentation. A few steps need you, because they happen in your own Google and Facebook accounts.

Everything here is **free**. No company, no paid domain and no credit card are needed. The site runs locally on `http://localhost:3000` and online on the free address `https://doulisha.vercel.app`.

Expected time: about 1 hour in total.

---

## Summary

| #   | Task                                       | Status                                     | Time   |
| --- | ------------------------------------------ | ------------------------------------------ | ------ |
| 1   | Create the Google sign-in keys             | Done (2026-09-29), with the Vercel address | 15 min |
| 2   | Create the Facebook app and keys           | Done (2026-09-29), with the Vercel address | 20 min |
| 3   | Put the keys in `.env.local` and on Vercel | Done (2026-09-29)                          | 5 min  |
| 4   | Try signing in with Google and Facebook    | To do, once the pull request is merged     | 15 min |
| 5   | Read the draft Privacy, Terms, data pages  | To do                                      | 15 min |
| 6   | (Optional) Try story sharing on your phone | To do, once the pull request is merged     | 10 min |

## Three rules for secrets

1. **Never paste a secret into the chat**, an issue, a commit or a screenshot. "Client secret" and "App secret" are passwords for Doulisha.
2. Secrets go **only** in the `.env.local` file at the root of the project. Git ignores it, so it is never pushed.
3. If a secret leaks, reset it in the Google or Meta console (they have a "reset" button) and put the new one in `.env.local`.

---

## Task 1: Google sign-in keys

You need a Google account (your Gmail is fine). Google changes its screens from time to time: if a name below differs slightly, look for the closest one, or send Claude a screenshot **without secrets on it**.

1. Open <https://console.cloud.google.com> and sign in.
2. **Create a project:**
   1. Click the project picker at the top.
   2. Click **New project**. Name: `Doulisha`. Organization: none.
   3. Click **Create**, then make sure `Doulisha` is selected at the top.
   4. No billing account is needed for sign-in.
3. **Set up the consent screen:**
   1. In the menu, open **Google Auth Platform** (older name: "APIs & Services → OAuth consent screen").
   2. Click **Get started** and fill in:
      - App name: `Doulisha`
      - User support email: `bouhelii.hedi@gmail.com`
      - Audience: **External**
      - Contact email: `bouhelii.hedi@gmail.com`
   3. Accept the policy and click **Create**.
   4. **Do not upload a logo for now.** A logo starts a Google review that is not needed yet.
4. **Add test users:**
   1. Open **Audience** and leave the status on **Testing**.
   2. Under **Test users**, click **Add users** and add your Gmail and the Gmail addresses of anyone who will test (up to 100).
   3. While the app is in Testing, only these people can sign in with Google. That is fine until launch.
5. **Check the permissions:** open **Data access**. You do not need to add anything. Doulisha only asks for the basic `openid`, `email` and `profile`, which need no review.
6. **Create the keys:**
   1. Open **Clients** and click **Create client**.
   2. Application type: **Web application**. Name: `Doulisha web (local)`.
   3. **Authorized JavaScript origins:** add `http://localhost:3000`
   4. **Authorized redirect URIs:** add `http://localhost:3000/api/auth/callback/google`
   5. Click **Create**.
7. **Copy the two values straight away:** the **Client ID** (ends with `.apps.googleusercontent.com`) and the **Client secret**. Also click **Download JSON** and keep that file somewhere private, **outside** the project folder. Google may not show the secret again. If you lose it, create a new secret on the same client.

## Task 2: Facebook app and keys

You need a Facebook account. Meta changes its screens often, so names may differ slightly.

1. **Become a Meta developer:**
   1. Open <https://developers.facebook.com> and click **Get started** (or **Log in**).
   2. Confirm your account with your phone number when asked.
2. **Create the app:**
   1. Go to **My Apps → Create app** and fill in:
      - App name: `Doulisha`
      - App contact email: `bouhelii.hedi@gmail.com`
   2. Use case: choose **Authenticate and request data from users with Facebook Login**.
   3. Business portfolio: choose **I don't want to connect a business portfolio yet**. You can connect one later, once Doulisha is a company.
   4. Finish the steps and open the app dashboard.
3. **Allow the email address:**
   1. Open **Use cases**, then **Authenticate and request data from users with Facebook Login**, then **Customize** (or **Permissions**).
   2. Make sure **public_profile** and **email** are added. Click **Add** next to `email` if needed.
4. **Set the redirect address:**
   1. In the Facebook Login **Settings**, find **Valid OAuth Redirect URIs**.
   2. Add `http://localhost:3000/api/auth/callback/facebook` and save.
   3. If Facebook refuses an `http` address, leave the list empty. In Development mode, Facebook allows `localhost` addresses automatically.
5. **Copy the keys:**
   1. Open **App settings → Basic**.
   2. Copy the **App ID**.
   3. Click **Show** next to **App secret** (Facebook asks for your password) and copy it.
6. **Leave the app in Development mode.** Only people with a role on the app can sign in with Facebook. That is what we want for now.
7. **Add testers (optional):**
   1. Open **App roles → Roles → Add people → Testers** and add their Facebook names.
   2. Each tester must accept the invitation at <https://developers.facebook.com/requests> (they also need a free developer account).

Nothing else is needed for now: no business verification, no app review, no privacy URL. Those come at launch (see "Later" below).

## Task 3: Put the keys in `.env.local`

1. Open the `.env.local` file at the **root** of the project (next to `package.json`), not the one in `apps/web`.
2. Add these four lines at the end, with your values (no quotes, no spaces around `=`):

   ```sh
   GOOGLE_CLIENT_ID=paste-the-google-client-id
   GOOGLE_CLIENT_SECRET=paste-the-google-client-secret
   FACEBOOK_CLIENT_ID=paste-the-facebook-app-id
   FACEBOOK_CLIENT_SECRET=paste-the-facebook-app-secret
   ```

3. Save the file and restart the web app: stop `pnpm dev` (Ctrl+C) and run it again. Keys are only read at start-up.
4. Tell Claude **"keys added"**, without the values. Claude checks that the Google and Facebook buttons appear. Each button only appears once its keys are set.

## Task 4: Try it

The easiest place is the live site, `https://doulisha.vercel.app`, once the pull request of this phase is merged into `main` (Vercel then redeploys by itself). Your Google and Facebook apps already know that address.

To try on `http://localhost:3000` instead, first add to the Google client (Google Auth Platform → Clients → `Doulisha web`): `http://localhost:3000` under **Authorized JavaScript origins** and `http://localhost:3000/api/auth/callback/google` under **Authorized redirect URIs**. Facebook accepts `localhost` on its own while the app is in Development mode.

Good to know about the live site for now: SMS and email codes are not really sent yet (Phase 6), so on the live site new accounts come from Google or Facebook. It uses the `dev` database (OPEN_QUESTIONS Q26).

1. **New account with Google:** open `/fr/sign-up`, choose **Organiser** or **Participer**, then **Continuer avec Google**. Your Gmail must be in the Google **test users**. You should land on the account setup: name prefilled, city, **no password asked**. With **Organiser**, the organizer onboarding follows.
2. **Connect Facebook to the same account:** open the avatar menu → **Mon compte**. Under **Moyens de connexion**, click **Relier** next to Facebook. Back on Doulisha, a green message says Facebook is connected.
3. **Sign in with Facebook:** sign out, then on `/fr/sign-in` click **Continuer avec Facebook**. You should be in the same account.
4. **Remove one:** in **Mon compte**, click **Retirer** next to Google and confirm. The **Retirer** button is greyed out when an account is your only way to sign in (the automated tests check that case).
5. **Already used email:** if your Gmail already has a Doulisha account made with a code, **Continuer avec Google** explains that the email is taken: sign in the usual way, then connect Google from **Mon compte**. This is on purpose, so nobody can take over an account through Google or Facebook.
6. **Arabic:** repeat step 1 quickly on `/ar/sign-up`.
7. **Report back:** tell Claude what worked and what did not. Screenshots are welcome, without secrets.

## Task 5: Read the draft Privacy, Terms and data deletion pages

The pages name **Doulisha** as the service and **bouhelii.hedi@gmail.com** as the contact. They describe what the app really stores and why.

1. Open these pages in each language (`fr`, `ar`, `en`):
   - `http://localhost:3000/fr/privacy`
   - `http://localhost:3000/fr/terms`
   - `http://localhost:3000/fr/data-deletion`
2. Check that nothing is false or missing (for example, a feature described that does not exist, or a promise you cannot keep, such as a reply delay).
3. Tell Claude what to change.

These pages are **drafts written by an AI, not legal advice**. They are enough for testing and for Google and Facebook, which check that the pages exist and match the app. Before a real public launch with real users, have someone check them against Tunisian personal-data law (organic law 2004-63, supervised by the INPDP).

## Task 6 (optional): Story sharing on your phone

The phone's share menu only works on a secure `https` address, which the live site has.

1. On your phone, open an event on `https://doulisha.vercel.app`, tap **Story et visuels (Instagram, TikTok…)**, then **Partager** under the story.
2. Choose **Instagram → Story**, add the event link with a **Link** sticker and look at the result. Do not post it if you do not want to.
3. On a computer, the same window offers **Télécharger** instead, and copies the event link.
4. Tell Claude how it looked.

---

## Later (not in this phase)

Nothing here is needed now. It is listed so you know what comes next.

- **Before launch:**
  - **Production database:** switch the live site from the `dev` database to `production`, with migrations applied automatically on each deploy (OPEN_QUESTIONS Q26).
  - Vercel's free plan is meant for non-commercial use: when organizers start paying, check whether you need the paid plan.
  - **Open sign-in to everyone:**
    - Google: in **Branding**, add the homepage, privacy and terms links, then **Publish app** on the Audience page.
    - Facebook: in **App settings → Basic**, fill in the Privacy Policy URL, the **User data deletion** URL (`…/data-deletion`), an app icon (1024×1024) and a category, then switch the app to **Live**.
- **Once Doulisha is a registered company:**
  - connect the Facebook app to a business portfolio and complete **business verification**;
  - request the Meta permissions to publish to Facebook Pages and Instagram accounts (the spec's SHR-05, V1). Meta's review usually takes 2–4 weeks.
- **iPhone app:** "Sign in with Apple" needs an Apple Developer account ($99/year). It is only required once the iPhone app offers Google or Facebook sign-in.
- **TikTok publishing:** after TikTok's audit of the app. Until then, posts it publishes stay private.

## Checklist

- [x] Google project `Doulisha` created, consent screen in **Testing**, test users added
- [x] Google web client created with the Vercel address; Client ID and secret saved privately
- [x] Facebook app `Doulisha` created in **Development** mode with `email` and `public_profile`
- [x] Keys added to the root `.env.local` and to Vercel; `NEXT_PUBLIC_APP_URL` set on Vercel
- [ ] Sign-up with Google, connecting and signing in with Facebook, and removing tried in French and Arabic
- [ ] Privacy, Terms and data deletion pages read in the three languages, corrections sent
- [ ] (Optional) Story shared from a phone
