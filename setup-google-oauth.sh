#!/bin/bash

echo "================================================"
echo "Google OAuth Setup Helper"
echo "================================================"
echo ""
echo "This script will help you add your Google OAuth credentials."
echo ""
echo "First, follow these steps:"
echo "1. Open: https://console.cloud.google.com/"
echo "2. Follow the instructions in GOOGLE_OAUTH_SETUP.md"
echo "3. Come back here when you have your credentials"
echo ""
echo "Press Enter when you're ready to continue..."
read

echo ""
echo "Enter your Google Client ID:"
echo "(It looks like: 123456789-abc123.apps.googleusercontent.com)"
read -p "Client ID: " CLIENT_ID

echo ""
echo "Enter your Google Client Secret:"
echo "(It looks like: GOCSPX-abc123xyz)"
read -p "Client Secret: " CLIENT_SECRET

# Update .env file
cd backend
sed -i.bak "s|GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=${CLIENT_ID}|g" .env
sed -i.bak "s|GOOGLE_CLIENT_SECRET=.*|GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}|g" .env
rm .env.bak

echo ""
echo "✓ Credentials saved to backend/.env"
echo ""
echo "Testing configuration..."

# Check if credentials look valid
if [[ $CLIENT_ID == *"apps.googleusercontent.com"* ]]; then
    echo "✓ Client ID format looks good"
else
    echo "⚠️  Warning: Client ID format might be incorrect"
fi

if [[ $CLIENT_SECRET == GOCSPX-* ]] || [[ ${#CLIENT_SECRET} -gt 20 ]]; then
    echo "✓ Client Secret format looks good"
else
    echo "⚠️  Warning: Client Secret format might be incorrect"
fi

echo ""
echo "================================================"
echo "Setup Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Start the backend: cd backend && npm start"
echo "2. Start the frontend: cd frontend && npm start"
echo "3. Open http://localhost:3000"
echo ""
