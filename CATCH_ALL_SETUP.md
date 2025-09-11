# Catch-All Email Setup Guide

## 1. Mailgun Catch-All Configuration

### A. Enable Catch-All in Mailgun Dashboard
1. Go to **Mailgun Dashboard** → **Domains** → **do-mails.space**
2. Click **"Domain Settings"** or **"Routes"**
3. Create a new route with these settings:
   ```
   Priority: 0
   Filter Expression: match_recipient(".*@do-mails.space")
   Actions: forward("https://your-domain.com/api/webhooks/mailgun")
   Description: Catch-all for do-mails.space
   ```

### B. Alternative: Use Mailgun API to Create Route
```bash
curl -s --user 'api:YOUR_API_KEY' \
    https://api.mailgun.net/v3/routes \
    -F priority=0 \
    -F description='Catch-all for do-mails.space' \
    -F expression='match_recipient(".*@do-mails.space")' \
    -F action='forward("https://your-domain.com/api/webhooks/mailgun")'
```

## 2. DNS Configuration (Already Done)
Your MX records are already set up correctly:
- MX 10 mxa.mailgun.org
- MX 10 mxb.mailgun.org

## 3. Webhook Configuration (Already Done)
Your webhook endpoint is already configured:
- URL: https://your-domain.com/api/webhooks/mailgun
- Events: All email events

## 4. Benefits of This Setup
- ✅ Receive emails at ANY address on your domain
- ✅ No need to pre-create aliases
- ✅ Complete email management in your web app
- ✅ Reply from any address on your domain
- ✅ Professional email system without Gmail dependency

## 5. Testing
Send emails to these addresses to test:
- test123@do-mails.space
- hello@do-mails.space
- random@do-mails.space
- anything@do-mails.space

All should be captured by your application!
