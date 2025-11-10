# IB Networking Email App

A professional email management platform for students recruiting for investment banking. Send personalized, template-based emails to bankers with variable substitution, all sent through your actual Gmail account to avoid spam filters.

## Features

- **Gmail Integration**: Send emails directly through your Gmail account using OAuth2
- **Template System**: Create and manage reusable email templates with variable placeholders
- **Variable Substitution**: Easily personalize emails with `{{variable_name}}` syntax
- **Email History**: Track all sent emails with full details
- **Professional UI**: Clean, intuitive interface designed for networking workflows
- **Secure Authentication**: JWT-based authentication with bcrypt password hashing

## Tech Stack

### Backend
- Node.js + Express
- PostgreSQL database
- Gmail API (OAuth2)
- JWT authentication
- bcrypt for password hashing

### Frontend
- React
- React Router
- Axios for API calls
- Context API for state management

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- Google Cloud Console account (for Gmail API)

### 1. Database Setup

Create a PostgreSQL database:

```bash
createdb ib_networking
```

Or use a hosted PostgreSQL service like:
- Heroku Postgres
- Railway
- Supabase
- Neon

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URI: `http://localhost:3001/api/gmail/callback`
   - Save the Client ID and Client Secret

### 3. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env and add your configuration:
# - DATABASE_URL: Your PostgreSQL connection string
# - JWT_SECRET: A random secret key
# - GOOGLE_CLIENT_ID: From Google Cloud Console
# - GOOGLE_CLIENT_SECRET: From Google Cloud Console
# - GOOGLE_REDIRECT_URI: http://localhost:3001/api/gmail/callback

# Start the server (database tables will be created automatically)
npm start

# Or use nodemon for development
npm run dev
```

The backend will run on [http://localhost:3001](http://localhost:3001)

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# The .env file is already configured for local development
# If needed, you can edit it to change the API URL

# Start the development server
npm start
```

The frontend will run on [http://localhost:3000](http://localhost:3000)

### 5. Seed Default Templates (Optional)

After creating a user account, you can add default IB networking templates:

```bash
cd backend
node seed-templates.js
```

This will add 4 professional email templates to your account:
- Initial Coffee Chat Request
- Follow-up After Coffee Chat
- Informational Interview Request
- Alumni Connection

## Usage Guide

### 1. Create an Account

- Navigate to [http://localhost:3000/signup](http://localhost:3000/signup)
- Create your account with email and password

### 2. Connect Gmail

- After logging in, click "Connect Gmail Account" on the dashboard
- Authorize the application to send emails on your behalf
- You'll only need to do this once

### 3. Create Email Templates

- Go to "Templates" in the sidebar
- Click "Create Template"
- Use `{{variable_name}}` syntax for variables, e.g.:
  - `{{banker_name}}`
  - `{{bank_name}}`
  - `{{your_name}}`
  - `{{school}}`

Example template:
```
Subject: Seeking Career Advice - {{school}} Student

Dear {{banker_name}},

I hope this email finds you well. My name is {{your_name}}, and I am a
{{year}} at {{school}} interested in investment banking at {{bank_name}}.

Would you be available for a brief 15-20 minute coffee chat?

Best regards,
{{your_name}}
```

### 4. Compose and Send Emails

- Go to "Compose Email"
- Select a template or start from scratch
- Fill in the variable values
- Preview your email
- Enter recipient email address
- Click "Send Email"

### 5. Track Sent Emails

- Go to "Sent Emails" to view your history
- Click "View" to see full email details
- Track who you've contacted and when

## Template Variables Best Practices

### Common Variables for IB Networking

- `{{your_name}}` - Your full name
- `{{school}}` - Your university
- `{{year}}` - Your year (e.g., "junior", "senior")
- `{{major}}` - Your major
- `{{email}}` - Your email address
- `{{banker_name}}` - Banker's name
- `{{bank_name}}` - Bank name (e.g., "Goldman Sachs")
- `{{group}}` - Group/division (e.g., "M&A", "Leveraged Finance")
- `{{referral_name}}` - Person who referred you
- `{{grad_year}}` - Graduation year
- `{{day}}` - Day reference (e.g., "yesterday", "last Tuesday")
- `{{topic_discussed}}` - Topic from previous conversation

## Security Notes

- **Never commit .env files** to version control
- All passwords are hashed with bcrypt
- Gmail OAuth tokens are stored securely in the database
- Emails are sent through your actual Gmail account (no SMTP impersonation)
- JWT tokens expire after 7 days

## Why Gmail API?

Investment banks have sophisticated email filters. By sending emails through the Gmail API:
- Emails come from YOUR actual Gmail account
- No spoofing or impersonation flags
- Better deliverability
- Appears in your Gmail Sent folder
- Completely legitimate and professional

## Troubleshooting

### Gmail Connection Issues

If you have trouble connecting Gmail:
1. Make sure you've enabled Gmail API in Google Cloud Console
2. Verify the redirect URI matches exactly: `http://localhost:3001/api/gmail/callback`
3. Check that your Google OAuth client ID and secret are correct in `.env`
4. Try using an incognito window for the OAuth flow

### Database Connection Issues

- Verify your `DATABASE_URL` is correct
- Make sure PostgreSQL is running
- Check that the database exists
- Ensure your database user has proper permissions

### Email Not Sending

- Verify Gmail is connected (check Dashboard)
- Check browser console for errors
- Look at backend logs for error messages
- Ensure recipient email is valid

## Project Structure

```
ib-networking-app/
├── backend/
│   ├── server.js           # Main Express server
│   ├── seed-templates.js   # Template seeding script
│   ├── .env.example        # Environment variables template
│   └── package.json        # Backend dependencies
│
└── frontend/
    ├── src/
    │   ├── api/            # API client functions
    │   ├── components/     # Reusable components
    │   ├── contexts/       # React Context (Auth)
    │   ├── pages/          # Page components
    │   ├── App.js          # Main App component
    │   └── App.css         # Global styles
    └── package.json        # Frontend dependencies
```

## Deployment

### Backend Deployment (Railway/Heroku)

1. Create a new app on your hosting platform
2. Add PostgreSQL database
3. Set environment variables from `.env.example`
4. Update `GOOGLE_REDIRECT_URI` to your production domain
5. Deploy the `backend` directory

### Frontend Deployment (Vercel/Netlify)

1. Build the frontend: `npm run build`
2. Set `REACT_APP_API_URL` to your backend URL
3. Deploy the build directory

Don't forget to update the Google OAuth redirect URI in Google Cloud Console to include your production callback URL.

## Future Enhancements

Potential features to add:
- Email scheduling
- Bulk email sending with rate limiting
- Email analytics (open rates, reply tracking)
- Contact management (CRM-lite)
- Email sequences/drip campaigns
- Rich text editor for HTML emails
- Attachment support
- Email templates marketplace

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review backend logs for error messages
3. Check browser console for frontend errors

## License

MIT License - feel free to use this for your IB recruiting!

---

Built for students recruiting for investment banking. Good luck with your networking!
