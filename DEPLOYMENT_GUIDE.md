# 🚀 Production Deployment Guide

## 📋 Pre-Deployment Checklist

- ✅ All changes committed and pushed to main branch
- ✅ Database migrations applied
- ✅ Environment variables configured
- ⏳ Production deployment (next step)
- ⏳ Mailgun catch-all route configuration (after deployment)

## 🌐 Deployment Options

### Option 1: Vercel (Recommended for Next.js)

**1. Install Vercel CLI:**

```bash
npm install -g vercel
```

**2. Deploy:**

```bash
vercel --prod
```

**3. Set Environment Variables:**
After deployment, go to [Vercel Dashboard](https://vercel.com/dashboard) → Your Project → Settings → Environment Variables

Add these environment variables (get values from your `.env.production` file):

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
MAILGUN_DOMAIN=do-mails.space
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_WEBHOOK_SIGNING_KEY=your_mailgun_webhook_signing_key
MAILGUN_BASE_URL=https://api.mailgun.net
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://YOUR-VERCEL-URL.vercel.app
APP_BASE_URL=https://YOUR-VERCEL-URL.vercel.app
NODE_ENV=production
```

**Important:** Use the actual values from your `.env.production` file, not the placeholders above.

**4. Redeploy:**

```bash
vercel --prod
```

### Option 2: Netlify

**1. Install Netlify CLI:**

```bash
npm install -g netlify-cli
```

**2. Deploy:**

```bash
netlify deploy --prod
```

**3. Set Environment Variables:**
Go to [Netlify Dashboard](https://app.netlify.com) → Your Site → Site Settings → Environment Variables

Add the same variables as above, but replace URLs with your Netlify URL.

## 🔗 After Deployment

### 1. Get Your Webhook URL

Your webhook URL will be:

```
https://your-deployed-domain.com/api/webhooks/mailgun
```

### 2. Configure Mailgun Catch-All Route

Go to [Mailgun Dashboard](https://app.mailgun.com) → Domains → do-mails.space → Routes

Create new route:

```
Expression Type: Catch All
Forward: https://your-deployed-domain.com/api/webhooks/mailgun
Priority: 0
Description: Catch-all emails for do-mails.space
```

### 3. Test the System

1. Send email to `test@do-mails.space`
2. Check your deployed app's inbox
3. Try sending emails from your app
4. Verify catch-all functionality

## 🔧 Environment Variables Explanation

| Variable                        | Purpose                | Notes                         |
| ------------------------------- | ---------------------- | ----------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL   | Public, safe to expose        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Public, safe to expose        |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service role  | **SECRET** - server-side only |
| `MAILGUN_API_KEY`               | Mailgun API access     | **SECRET** - server-side only |
| `MAILGUN_WEBHOOK_SIGNING_KEY`   | Webhook verification   | **SECRET** - server-side only |
| `NEXTAUTH_URL`                  | Your app's URL         | Must match deployment URL     |
| `APP_BASE_URL`                  | Your app's base URL    | Must match deployment URL     |

## 🚨 Security Notes

- Never commit `.env.production` to git
- Keep all SECRET keys secure
- Use different keys for production if possible
- Regularly rotate API keys

## 🐛 Troubleshooting

**Deployment fails:**

- Check build logs for errors
- Ensure all dependencies are in package.json
- Verify environment variables are set

**Webhook not receiving emails:**

- Verify webhook URL is accessible
- Check Mailgun route configuration
- Check deployment logs for errors

**Database connection issues:**

- Verify Supabase environment variables
- Check RLS policies are applied
- Ensure migrations are run
