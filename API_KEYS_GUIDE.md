# Getting API Keys for ReelShare

To connect a real social media account on the **Social Accounts** page, ReelShare needs your own developer API credentials (a **Client ID** and **Client Secret**) for that platform. This is standard for any app that publishes to social media on your behalf — you register a small "app" with the platform, and it gives you keys that only your ReelShare install uses.

**Where to enter these once you have them:** open ReelShare → **Settings → API Keys**, pick the platform tab, and paste in the Client ID, Client Secret, and Redirect URI.

**Redirect URI note:** ReelShare pre-fills a default redirect URI for each platform (e.g. `http://localhost:3000/auth/instagram/callback`). Whatever value is shown in Settings must be entered **exactly** as the redirect/callback URI in that platform's developer portal too — they have to match character-for-character.

---

## Instagram

Instagram's publishing API is part of Meta's Graph API, so you'll create an app on the Meta for Developers site.

1. Go to **[developers.facebook.com](https://developers.facebook.com/apps/)** and log in with a Facebook account (create one if needed — it doesn't have to be your personal account).
2. Click **My Apps → Create App**.
3. Choose an app type — pick **Business** (this unlocks the Instagram/Pages products you need).
4. Give the app a name and confirm creation. You'll land on the App Dashboard.
5. In the left sidebar, click **Add Product**, find **Instagram Graph API**, and click **Set Up**.
6. Go to **App Settings → Basic** in the left sidebar. Here you'll find:
   - **App ID** → this is your **Client ID**
   - **App Secret** (click "Show") → this is your **Client Secret**
7. Under **App Settings → Basic**, scroll to **Valid OAuth Redirect URIs** (you may need to add the **Facebook Login** product first to see this field) and paste in the redirect URI shown in ReelShare's Settings.
8. Copy the App ID and App Secret into ReelShare's Settings → API Keys → Instagram tab.

**Important:** Instagram publishing requires your Instagram account to be a **Business or Creator account** linked to a **Facebook Page** — a personal Instagram account alone won't work with this API. You can convert your account to a Business/Creator account for free from the Instagram app's settings.

**Note on review:** While your app is in development mode, only accounts you explicitly add as "testers" in the Meta dashboard (App Roles → Roles) can connect. To let any Instagram account connect, Meta requires an app review process — for personal/small-scale use, testing mode is usually enough.

---

## Facebook

Facebook Page publishing uses the same Meta for Developers platform as Instagram.

1. If you already made an app for Instagram above, **reuse it** — skip to step 5.
2. Otherwise, go to **[developers.facebook.com](https://developers.facebook.com/apps/) → My Apps → Create App**, choose **Business**, and create the app.
3. In the left sidebar, click **Add Product** and set up **Facebook Login**.
4. Also add the **Pages API** product if it's listed separately (on newer apps this is often bundled with Facebook Login).
5. Go to **App Settings → Basic**:
   - **App ID** → your **Client ID**
   - **App Secret** → your **Client Secret**
6. Under **Facebook Login → Settings**, add ReelShare's redirect URI to **Valid OAuth Redirect URIs**.
7. Copy the App ID and App Secret into ReelShare's Settings → API Keys → Facebook tab.

**Important:** You need to be an **admin of at least one Facebook Page** (not just a personal profile) — ReelShare publishes to a Page you manage, not to your personal timeline.

---

## TikTok

1. Go to **[developers.tiktok.com](https://developers.tiktok.com/)** and log in (or create a TikTok for Developers account).
2. Click **Manage apps → Create an app** (also called "Register an app" in some flows).
3. If prompted to select an app owner, choose an organization, or create one if you don't have one yet.
4. Fill in your app's basic details (name, description, category, icon).
5. Once the app is created, go to its dashboard — you'll find:
   - **Client key** → this is your **Client ID**
   - **Client secret** → this is your **Client Secret**
6. Add the products you need: **Login Kit** (for authentication) and **Content Posting API** (for uploading videos). Each product may need to be individually enabled from the app dashboard.
7. Under the app's platform/redirect settings, add ReelShare's redirect URI.
8. Copy the Client Key and Client Secret into ReelShare's Settings → API Keys → TikTok tab.

**Important:** TikTok requires apps using the Content Posting API to go through an **approval/review process** before they can post on behalf of arbitrary users. Until approved, your app typically runs in a **sandbox mode** limited to your own test account(s) — which is normally sufficient if you're only posting from your own TikTok account.

---

## YouTube

YouTube uses Google's OAuth system via Google Cloud Console.

1. Go to **[console.cloud.google.com](https://console.cloud.google.com/)** and sign in with a Google account.
2. Create a new project (top bar → project dropdown → **New Project**), or select an existing one.
3. Go to **APIs & Services → Library**, search for **YouTube Data API v3**, and click **Enable**.
4. Go to **APIs & Services → Credentials**.
5. Click **Create Credentials → OAuth client ID**.
   - If prompted, configure the **OAuth consent screen** first (choose **External** user type for a personal project; fill in an app name and your email; you can leave it in "Testing" status).
   - For **Application type**, choose **Desktop app** (this matches how ReelShare runs — a local Electron app, not a website).
   - Give it a name and click **Create**.
6. Google will show you a **Client ID** and **Client Secret** — copy both.
7. Back on the **OAuth consent screen** page, under **Test users**, add the Google account(s) you'll actually use to log in to YouTube through ReelShare (required while the app is in "Testing" status).
8. Copy the Client ID and Client Secret into ReelShare's Settings → API Keys → YouTube tab.

**Note:** While your OAuth consent screen is in "Testing" mode, only the test users you explicitly added in step 7 can authenticate. This is fine for personal use. Publishing the app for public/unlimited use requires Google's verification process, which isn't necessary if you're only connecting your own channel.

---

## Quick Reference

| Platform | Portal | Client ID is called... | Client Secret is called... |
|---|---|---|---|
| Instagram | developers.facebook.com | App ID | App Secret |
| Facebook | developers.facebook.com | App ID | App Secret |
| TikTok | developers.tiktok.com | Client key | Client secret |
| YouTube | console.cloud.google.com | Client ID | Client secret |

## Troubleshooting

- **"Add your API credentials first" toast when clicking Connect Account:** you haven't saved a Client ID + Client Secret for that platform yet in Settings → API Keys.
- **Redirect URI mismatch error from the platform:** the redirect URI in the platform's developer portal doesn't exactly match the one shown in ReelShare's Settings — copy it again, no trailing slash differences.
- **"App not verified" / "This app hasn't completed Meta's review" warnings:** normal while your app is in development/testing mode — as long as your own account is added as a tester, you can proceed past this warning.
- **Can't find Instagram Graph API product on Meta:** make sure the app type is **Business**, not **Consumer** — the Consumer app type doesn't expose the Instagram Graph API product.

## Security Notes

- Your Client Secret is sensitive — treat it like a password. ReelShare stores it locally on your device only (see Settings → API Keys page for details); it's never transmitted anywhere except directly to the platform you're authenticating with.
- These developer portals are free to use for personal-scale projects like connecting your own accounts through ReelShare.
