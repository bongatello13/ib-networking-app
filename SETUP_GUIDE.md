# Setup Guide - IB Networking App Phase 1

This guide will walk you through setting up the new Companies and enhanced Contact tracking features.

## Step 1: Run Database Migration

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://supabase.com/dashboard
2. Click on your project: `uasusvdgevopuhwshtmt`
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Open the file `migrations/002_add_companies_and_tracking.sql`
6. Copy the entire contents
7. Paste into the Supabase SQL editor
8. Click **Run** (or press Cmd/Ctrl + Enter)
9. You should see: "Success. No rows returned"

### Verify Migration Success

Run this query in the SQL Editor to verify:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('companies', 'timeline_notes');

-- Should return 2 rows: companies, timeline_notes
```

## Step 2: Install Dependencies (if needed)

The backend already has all necessary dependencies. If you need to reinstall:

```bash
cd backend
npm install
```

## Step 3: Start the Backend Server

```bash
cd backend
npm run dev
```

You should see:
```
Server running on port 3001
Environment: development
Supabase URL: ✓ Configured
```

## Step 4: Start the Frontend

In a new terminal:

```bash
cd frontend
npm install  # Only if this is first time
npm start
```

The app should open at http://localhost:3000

## Step 5: Test the New Features

### Test 1: Create a Company

1. Log in to the app
2. Click **🏢 Companies** in the sidebar
3. Click **➕ Add Company**
4. Fill in:
   - Name: Moelis & Company
   - Ranking: Heavy Target
   - Industry: Investment Banking
   - Sector: Financial Services
5. Click **Create**
6. You should see the company card appear

### Test 2: Add a Contact to the Company

1. Click on the "Moelis & Company" company card to expand it
2. Click **➕ Add Contact**
3. Fill in:
   - Name: Sam Petersen
   - Email: sam.petersen@moelis.com
   - Position: Analyst
   - Tags: PDT, Event (comma-separated)
   - Initial Note: "Met at Moelis networking event. Discussed PDT group."
4. Click **Add Contact**
5. The contact should appear in the company's contact table with:
   - 🔴 Red status (None - not contacted yet)
   - Tags showing as blue chips

### Test 3: Send an Email (Auto-Status Update)

1. Click **✉️ Compose Email** in sidebar
2. Compose an email to sam.petersen@moelis.com
3. Send the email
4. Go back to **🏢 Companies**
5. Expand "Moelis & Company"
6. The contact status should automatically change from 🔴 → 🟡 (Emailed)
7. The "Last Contact" date should be today

### Test 4: Add More Companies

Test with your real spreadsheet data:

1. Add these companies:
   - Guggenheim Partners (Heavy Target)
   - Bank of America (Target)
   - Goldman Sachs (Heavy Target)
   - Citi (Target)

2. Add 2-3 contacts to each company

3. Verify the accordion view works (expand/collapse)

## What's New?

### Backend (server.js)
✅ **New API Endpoints:**
- `GET /api/companies` - List all companies
- `GET /api/companies/:id` - Get company with contacts
- `POST /api/companies` - Create company
- `PUT /api/companies/:id` - Update company
- `DELETE /api/companies/:id` - Delete company
- `GET /api/contacts/:id/notes` - Get timeline notes
- `POST /api/contacts/:id/notes` - Add timeline note
- `POST /api/contacts/:id/call` - Log phone call
- `PUT /api/contacts/:id/status` - Update status

✅ **Enhanced Contacts API:**
- Now supports filtering by status, quality, company_id, tags
- Returns company info with each contact
- Auto-populates dates when status changes

### Frontend

✅ **New Files:**
- `src/pages/Companies.js` - Company-first view with accordion layout
- `src/pages/Companies.css` - Professional UI styling (navy + amber theme)
- `src/api/companies.js` - Companies API client

✅ **Updated Files:**
- `src/App.js` - Added /companies route
- `src/components/Layout.js` - Added Companies link to sidebar (with emojis!)
- `src/api/contacts.js` - Added filtering, timeline notes, status update methods

### Database

✅ **New Tables:**
- `companies` - Company data (name, ranking, industry, notes)
- `timeline_notes` - Chronological interaction history per contact

✅ **Updated Tables:**
- `contacts` - Added 9 new columns:
  - `company_id` (links to companies table)
  - `phone`, `tags[]`, `quality`
  - `email_date`, `phone_date`, `last_contact_date`, `next_followup_date`
  - `email_history` (JSON for Gmail threads)

✅ **Database Triggers (Automatic!):**
- When you send an email → contact status auto-updates to "emailed"
- When you send an email → timeline note auto-created
- Dates auto-populate

## Features Now Available

### Company-First View
- ✅ Accordion layout (like your spreadsheet)
- ✅ Company cards with ranking badges (🎯 Heavy Target, 🔵 Target)
- ✅ Contact count per company
- ✅ Expand to see all contacts
- ✅ Color-coded status pipeline (🔴 → 🟡 → 🟢)

### Auto-Status Updates
- ✅ Send email → Status changes 🔴 → 🟡 automatically
- ✅ Log call → Status changes 🟡 → 🟢 automatically
- ✅ Dates auto-populate

### Timeline Notes
- ✅ Add chronological notes per contact
- ✅ Auto-create note when email sent
- ✅ Auto-create note when call logged
- ✅ View full interaction history

### Tag System
- ✅ Add tags to contacts (PDT, BAM, MIG, etc.)
- ✅ Visual tag chips
- ✅ Filter by tags (coming in next update)

### Quality Ratings
- ✅ Rate interactions: ⭐⭐⭐ Good, ⭐⭐ Okay, ⭐ Poor
- ✅ Shows in contact table

## Troubleshooting

### Migration Failed
**Error: relation "companies" already exists**
- Solution: Drop the table first, then re-run:
```sql
DROP TABLE IF EXISTS public.companies CASCADE;
DROP TABLE IF EXISTS public.timeline_notes CASCADE;
-- Then re-run the full migration
```

### Backend Won't Start
**Error: Cannot find module '@supabase/supabase-js'**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Frontend Shows 404 on /companies
- Make sure backend is running on port 3001
- Check browser console for errors
- Verify `src/pages/Companies.js` exists

### Status Not Auto-Updating
1. Check that migration ran successfully (triggers should exist)
2. Verify contact has valid email address
3. Check backend console for errors

### Contacts Not Showing in Company View
1. Make sure contact has `company_id` set
2. Try refreshing the page
3. Check backend response in Network tab

## Next Steps

Now that Phase 1 is complete, here are the recommended next features:

### Immediate (This Week)
1. ✅ **Test thoroughly** - Add real data from your spreadsheet
2. **Log phone calls** - Test the call logging feature
3. **Timeline notes** - Add notes to contacts

### Phase 1.5 (Next Week)
1. **Contact-First View** - Toggle to see all contacts across companies
2. **Advanced Filtering** - Filter by status, tags, quality
3. **Dashboard Widget** - "5 follow-ups due this week"
4. **Search** - Search across contacts and notes

### Phase 2 (Next Month)
1. **Recruiting Calendar** - Timeline view of deadlines
2. **Analytics** - Response rates, best templates
3. **LinkedIn Scraper** - Simple surface-level scraper
4. **Mobile Responsive** - Optimize for phone use

## Need Help?

If something isn't working:

1. Check backend console for errors
2. Check browser console (F12)
3. Verify migration ran successfully
4. Make sure both frontend and backend are running
5. Check that Supabase credentials are correct in `.env`

## Success Checklist

- [ ] Migration ran successfully (no errors)
- [ ] Backend server starts (port 3001)
- [ ] Frontend starts (port 3000)
- [ ] Can create a company
- [ ] Can add contact to company
- [ ] Company accordion expands/collapses
- [ ] Status icons show correctly (🔴🟡🟢)
- [ ] Ranking badges show (🎯🔵⚪)
- [ ] Tags display as blue chips
- [ ] Can send email (status auto-updates)
- [ ] Navigation sidebar shows Companies link

Once all checkboxes are ✅, you're ready to start using the new features!
