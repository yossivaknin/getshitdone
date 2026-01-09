# How to Check and Verify CORS Settings

## 1. **In Your Code (next.config.mjs)**
CORS headers are now configured in `next.config.mjs` to allow:
- `capacitor://localhost` (iOS)
- `http://localhost` (Android)
- All origins (`*`) for development

## 2. **On Vercel (if using Vercel)**
1. Go to https://vercel.com/dashboard
2. Select your project (usesitrep.com)
3. Go to **Settings** → **Headers**
4. Check if there are any custom headers that might override CORS
5. Go to **Settings** → **Domains** to verify the domain is correctly configured

## 3. **Test CORS from Command Line**
Run this to test if CORS is working:

```bash
# Test from iOS Capacitor origin
curl -H "Origin: capacitor://localhost" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://usesitrep.com/api/briefing \
     -v

# Test from Android Capacitor origin  
curl -H "Origin: http://localhost" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://usesitrep.com/api/briefing \
     -v
```

Look for these headers in the response:
- `Access-Control-Allow-Origin: *` (or your specific origin)
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH`
- `Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With`

## 4. **Check Browser Console**
1. Open your app in Capacitor
2. Open Safari (iOS) or Chrome (Android) Remote Debugger
3. Check the Network tab for failed requests
4. Look for CORS errors in the Console

## 5. **Common CORS Issues**
- ❌ **"No 'Access-Control-Allow-Origin' header"** → CORS not configured
- ❌ **"Credentials flag is true but origin is '*'"** → Need specific origins
- ❌ **"Method not allowed"** → Missing method in Access-Control-Allow-Methods

## 6. **For Production (More Secure)**
If you want to restrict to specific origins instead of `*`:

```javascript
// In next.config.mjs, replace '*' with:
value: 'capacitor://localhost, http://localhost, https://usesitrep.com'
```

Note: Multiple origins require checking the request origin and setting it dynamically.
