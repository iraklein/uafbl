# Yahoo OAuth Setup Instructions

## Quick Setup (5 minutes)

### 1. Create Yahoo Developer App

1. Go to: https://developer.yahoo.com/apps/
2. Sign in with your Yahoo account
3. Click **"Create an App"**
4. Fill out the form:
   - **Application Name**: `UAFBL Fantasy Tracker`
   - **Application Type**: `Web Application`
   - **API Permissions**: Check **"Fantasy Sports"** and **"Read"**
   - **Redirect URI(s)**: `http://localhost:3006/api/auth/yahoo/callback`
   - **Callback Domain**: `localhost:3006`
5. Click **"Create App"**

### 2. Get Your Credentials

After creating the app, you'll see:
- **Client ID** (starts with `dj0yJmk9...`)  
- **Client Secret** (32-character string)

### 3. Add to Environment Variables

Create/update `.env.local` file in your project root:

```bash
# Yahoo OAuth Credentials
YAHOO_CLIENT_ID=your_client_id_here
YAHOO_CLIENT_SECRET=your_client_secret_here
```

### 4. Test the OAuth Flow

1. Restart your dev server: `npm run dev`
2. Go to: `http://localhost:3006/api/auth/yahoo`
3. Should redirect to Yahoo login
4. After login, should redirect back with tokens

### 5. Import Your Rosters

Once OAuth is working:
```bash
curl -X POST http://localhost:3006/api/yahoo/import-rosters
```

## Alternative: Use Existing Yahoo App

If you already have a Yahoo Fantasy app registered, just update the redirect URI to:
`http://localhost:3006/api/auth/yahoo/callback`

## Troubleshooting

**"Client ID not configured"**: Environment variables not loaded, restart dev server
**"Invalid redirect URI"**: Make sure redirect URI in Yahoo app matches exactly
**"Uh oh" page**: Usually means redirect URI mismatch or expired credentials

## Security Note

The `.env.local` file should not be committed to git. It's already in your `.gitignore`.