# Fixing Google OAuth in Capacitor

## Issue
Google OAuth error: "device_id and device_name are required for private IP" or "invalid_request"

## Root Cause
Google OAuth doesn't allow:
- Custom URL schemes (like `com.sitrep.app://`)
- Private IP addresses (like `192.168.1.70`)

Google only allows:
- `localhost` or `127.0.0.1` (for development)
- Public domains with HTTPS (for production)

## Solution

### For iOS Simulator (Current Setup)
- Use `http://localhost:3000/api/auth/google/callback` as the redirect URI
- This works because the simulator can access localhost
- Google allows localhost for OAuth redirects

### For Physical Devices
You have two options:

#### Option 1: Use Production URL (Recommended)
1. Deploy your app to a public domain (e.g., Vercel, Netlify)
2. Use that URL in the redirect URI:
   ```
   https://yourdomain.com/api/auth/google/callback
   ```
3. Update `capacitor.config.ts` to use the production URL when on a physical device

#### Option 2: Use ngrok or similar tunnel
1. Create a tunnel to your local dev server:
   ```bash
   ngrok http 3000
   ```
2. Use the ngrok URL in the redirect URI
3. Add the ngrok URL to Google Cloud Console

## Current Configuration

### Google Cloud Console
Add these redirect URIs:
- `http://localhost:3000/api/auth/google/callback` (for simulator/dev)
- `https://your-production-domain.com/api/auth/google/callback` (for production/physical devices)

### Code
- Capacitor uses: `http://localhost:3000/api/auth/google/callback`
- Web uses: Current origin or `NEXT_PUBLIC_APP_URL`

## Testing

1. **In iOS Simulator:**
   - Should work with `localhost` redirect URI
   - Make sure dev server is running: `npm run dev`

2. **On Physical Device:**
   - Use production URL or ngrok
   - Update redirect URI accordingly

## Notes

- The app still loads from `http://192.168.1.70:3000` (for CSS/assets)
- But OAuth redirect URI must be `localhost` or a public domain
- This is a Google OAuth requirement, not a Capacitor limitation


