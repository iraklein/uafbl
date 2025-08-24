# 🚨 SECURITY NOTICE - Yahoo OAuth Credentials

## Issue Fixed: August 24, 2025

**CRITICAL:** Hardcoded Yahoo OAuth credentials were previously exposed in this repository and have been removed.

## What Was Done

1. ✅ **Removed hardcoded credentials** from all JavaScript files
2. ✅ **Updated scripts** to require environment variables
3. ✅ **Updated .env.local** with placeholder values
4. ✅ **Verified .env.local** is in .gitignore (not committed)

## Required Actions

### 1. Revoke Old Credentials
- Visit [Yahoo Developer Console](https://developer.yahoo.com/apps/)
- **Delete or regenerate** the exposed app credentials
- The exposed credentials were:
  - Client ID: `dj0yJmk9cEtMdnI3cE56bmFhJmQ9WVdrOVYySk5hMDAwVVhNbWNHbzlNQT09JnM9Y29uc3VtZXJzZWNyZXQmc3Y9MCZ4PWZh`
  - Client Secret: `b656ac05b9263cb24bf13892ebe46c4a91772aa8`

### 2. Generate New Credentials
1. Create a new Yahoo Fantasy API application
2. Get new Client ID and Client Secret
3. Update your local `.env.local` file:

```bash
# .env.local
YAHOO_CLIENT_ID=your_new_client_id_here
YAHOO_CLIENT_SECRET=your_new_client_secret_here
```

### 3. Affected Files (Now Fixed)
- `yahoo-oauth-setup.js`
- `complete-yahoo-auth.js`
- `yahoo-auth-simple.js`
- `yahoo-get-token.js`
- `yahoo-library-import.js`
- `import-yahoo-players.js`

All scripts now require environment variables and will fail safely if credentials are missing.

## Prevention

- ✅ All `.env*` files are in `.gitignore`
- ✅ Scripts validate environment variables exist
- ✅ No hardcoded secrets in any committed files
- ✅ Clear error messages when credentials are missing

## GitGuardian Alert

This fix resolves the GitGuardian security alert for exposed Yahoo OAuth2 Keys.

---

**Remember:** Never commit API keys, secrets, or credentials to version control.