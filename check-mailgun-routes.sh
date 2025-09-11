#!/bin/bash

# Check existing Mailgun routes
# Replace YOUR_API_KEY with your actual Mailgun API key

API_KEY="YOUR_API_KEY"

echo "Checking existing Mailgun routes..."

curl -s --user "api:$API_KEY" \
    https://api.mailgun.net/v3/routes \
    | jq '.'

echo "Done! Look for routes with 'do-mails.space' in the expression."
