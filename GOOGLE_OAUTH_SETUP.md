# Google OAuth Setup Guide

Follow these steps to get your Google OAuth credentials:

## 1. Go to Google Cloud Console

Open this link in your browser: https://console.cloud.google.com/

## 2. Create or Select a Project

- Click on the project dropdown at the top
- Click "NEW PROJECT"
- Name it: "IB Networking App"
- Click "CREATE"
- Wait for the project to be created (about 10 seconds)
- Make sure the new project is selected

## 3. Enable Gmail API

- In the left sidebar, click "APIs & Services" > "Library"
- In the search bar, type "Gmail API"
- Click on "Gmail API" in the results
- Click the blue "ENABLE" button
- Wait for it to enable (about 5 seconds)

## 4. Configure OAuth Consent Screen

- In the left sidebar, click "OAuth consent screen"
- Select "External" (unless you have a Google Workspace)
- Click "CREATE"
- Fill in the required fields:
  - App name: `IB Networking App`
  - User support email: (select your email)
  - Developer contact: (enter your email)
- Click "SAVE AND CONTINUE"
- On "Scopes" page, click "SAVE AND CONTINUE"
- On "Test users" page, add your Gmail address as a test user
- Click "SAVE AND CONTINUE"

## 5. Create OAuth Credentials

- In the left sidebar, click "Credentials"
- Click "CREATE CREDENTIALS" at the top
- Select "OAuth client ID"
- Application type: "Web application"
- Name: `IB Networking App`
- Under "Authorized redirect URIs", click "ADD URI"
- Enter EXACTLY: `http://localhost:3001/api/gmail/callback`
- Click "CREATE"

## 6. Copy Your Credentials

A popup will show your credentials:
- **Client ID** - looks like: `123456789-abc123.apps.googleusercontent.com`
- **Client Secret** - looks like: `GOCSPX-abc123xyz`

**IMPORTANT**: Copy both of these! You'll need them in the next step.

---

Once you have these credentials, come back and I'll help you configure the .env file!
