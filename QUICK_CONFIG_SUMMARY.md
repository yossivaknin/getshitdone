# Quick Configuration Summary for usesitrep.com

## 🚀 3 Critical Steps (Do These First!)

### 1. Vercel Environment Variable
**Where:** Vercel Dashboard → Project → Settings → Environment Variables
**What:** Update `NEXT_PUBLIC_APP_URL` to:
```
https://usesitrep.com
```
**Then:** Redeploy the app (Deployments → ⋯ → Redeploy)

---

### 2. Google Cloud Console
**Where:** [console.cloud.google.com](https://console.cloud.google.com/) → APIs & Services → Credentials → OAuth Client
**What:** Add to "Authorized redirect URIs":
```
https://usesitrep.com/auth/callback
```

---

### 3. Supabase Dashboard
**Where:** [app.supabase.com](https://app.supabase.com/) → Your Project → Authentication → URL Configuration
**What:** Add to "Redirect URLs":
```
https://usesitrep.com/auth/callback
```

---

## ✅ That's It!

After these 3 steps, test:
- Email/password login
- Google OAuth login
- Both should work at `https://usesitrep.com`

See `USESITREP_DOMAIN_CONFIG.md` for detailed instructions and troubleshooting.

