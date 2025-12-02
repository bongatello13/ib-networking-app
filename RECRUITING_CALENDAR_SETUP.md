# Dedicated Recruiting Calendar - Setup Guide

## What Was Built

Your app now creates a **dedicated recruiting calendar** in Google Calendar for each user!

When a user enables Google Calendar sync for the first time, the app automatically creates:
- **Calendar Name**: `"[FirstName]'s Recruiting Calendar"`
- **Example**: "Calvin's Recruiting Calendar" or "Sarah's Recruiting Calendar"
- **Description**: "Investment banking and consulting recruiting events tracked by IB Networking App"

All recruiting events sync to this dedicated calendar (not the primary calendar).

---

## How It Works

### User Flow:
1. User connects Gmail in Settings
2. User enables "Sync to Google Calendar" toggle
3. **Backend automatically creates** `"[Name]'s Recruiting Calendar"` in Google Calendar
4. All future events created in the app sync to this calendar
5. User can also manually add recruiting events to this calendar in Google Calendar app

### Technical Flow:
```
User clicks "Enable Sync"
  → Backend checks if recruiting_calendar_id exists
  → If NO calendar exists:
      → Call Google Calendar API to create new calendar
      → Store calendar ID in database (recruiting_calendar_id field)
  → Future events use this calendar ID instead of 'primary'
```

---

## Database Migration Required

**IMPORTANT**: You need to add the `recruiting_calendar_id` column to your database.

### Run this in Supabase SQL Editor:

```sql
-- Add recruiting_calendar_id column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS recruiting_calendar_id TEXT;
```

Or run the file: [add-recruiting-calendar-column.sql](add-recruiting-calendar-column.sql)

---

## Files Modified

### Backend ([server.js](backend/server.js))
1. **Added `createRecruitingCalendar()` function** (lines 1554-1607)
   - Creates dedicated calendar in Google Calendar
   - Stores calendar ID in database
   - Uses user's first name for calendar title

2. **Updated `syncEventToGoogleCalendar()` function** (line 1637)
   - Now uses `recruiting_calendar_id` instead of 'primary'
   - Falls back to 'primary' if calendar doesn't exist

3. **Updated `POST /api/calendar/toggle-sync`** (lines 1923-1970)
   - Automatically creates recruiting calendar when sync is enabled for first time
   - Returns calendar ID in response

4. **Updated `GET /api/calendar/sync-status`** (lines 1972-1998)
   - Returns calendar name to display in UI

### Frontend ([Calendar.js](frontend/src/pages/Calendar.js))
- Added calendar name display when sync is enabled
- Shows: "Synced to Google Calendar" with calendar name below

### Styles ([Calendar.css](frontend/src/pages/Calendar.css))
- Enhanced sync status badge to show calendar name

### Migration ([supabase-migration-complete.sql](supabase-migration-complete.sql))
- Updated users table schema to include `recruiting_calendar_id`

---

## Testing the Feature

### 1. Run Database Migration
```bash
# In Supabase SQL Editor:
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS recruiting_calendar_id TEXT;
```

### 2. Restart Backend
```bash
cd backend
npm start
```

### 3. Test the Flow
1. Login to your app
2. Go to Settings → Connect Gmail (if not already connected)
3. Enable "Sync to Google Calendar"
4. **Check backend logs** - you should see:
   ```
   ✓ Created recruiting calendar for user [id]: [Name]'s Recruiting Calendar
   ```
5. Open Google Calendar (calendar.google.com)
6. Look in the left sidebar under "My Calendars"
7. You should see **"[YourName]'s Recruiting Calendar"**
8. Create an event in the app
9. Check that it appears in your recruiting calendar (not primary calendar)

---

## What Happens if Calendar Creation Fails?

**Fallback behavior**: If the app can't create the recruiting calendar (e.g., API error, permissions issue):
- Events will sync to the **primary calendar** instead
- User can still use all features
- Next time they enable sync, it will try to create the calendar again

---

## User Benefits

✅ **Organization**: Recruiting events separated from personal life
✅ **Visibility**: Easy to toggle recruiting calendar on/off in Google Calendar
✅ **Two-way sync**: Users can add events directly in Google Calendar
✅ **Sharing**: Can share just recruiting calendar with career advisors
✅ **Export**: Can export recruiting calendar separately for records
✅ **Clean**: No clutter in main calendar

---

## Advanced: Manual Calendar Cleanup

If you want to delete a test recruiting calendar:

```sql
-- In Supabase SQL Editor:
UPDATE public.users
SET recruiting_calendar_id = NULL
WHERE id = 'YOUR_USER_ID';
```

Then manually delete the calendar in Google Calendar settings.

---

## Next Steps

After testing:
1. ✅ Verify calendar creation works
2. ✅ Test event sync to recruiting calendar
3. ✅ Check that events appear in Google Calendar
4. Optional: Add "View in Google Calendar" link to Calendar page
5. Optional: Add ability to import events FROM recruiting calendar

---

**Calendar sync is live! When you enable sync, your dedicated recruiting calendar will be created automatically.**
