#!/bin/bash

# Mailgun Catch-All Route Setup Script
# Replace YOUR_API_KEY with your actual Mailgun API key
# Replace YOUR_WEBHOOK_URL with your actual webhook URL

API_KEY="YOUR_API_KEY"
DOMAIN="do-mails.space"
WEBHOOK_URL="https://your-production-url.com/api/webhooks/mailgun"

echo "Creating catch-all route for $DOMAIN..."

curl -s --user "api:$API_KEY" \
    https://api.mailgun.net/v3/routes \
    -F priority=0 \
    -F description="Catch-all for $DOMAIN" \
    -F expression="match_recipient(\".*@$DOMAIN\")" \
    -F action="forward(\"$WEBHOOK_URL\")"

echo "Route created! Check your Mailgun dashboard to verify."
