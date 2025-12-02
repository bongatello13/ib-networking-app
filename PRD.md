# Product Requirements Document: IB Networking App

## 1. Executive Summary

### Problem Statement
Undergraduate students recruiting for investment banking and consulting face a fragmented, stressful networking process. They manually track dozens of contacts across spreadsheets, forget follow-ups, spend excessive time on email formatting, and lack visibility into their networking progress. This leads to missed opportunities, incomplete follow-through, and suboptimal recruiting outcomes.

### Solution
The IB Networking App streamlines and automates the entire networking workflow by replacing manual spreadsheets with an intelligent, integrated system that manages contacts, automates email sending, tracks interaction history, and ensures 100% follow-up completion.

### Target Users
**Primary Users**: Undergraduate students recruiting for careers requiring extensive networking (IB, consulting, private equity, corporate strategy)

**Distribution Model**: B2B2C - Sell to student clubs (finance clubs, consulting clubs, business fraternities) who distribute to their members

### Success Metrics
1. **Speed**: Students can send personalized emails in under 2 minutes
2. **Completion**: 100% follow-up and thank-you email completion rate
3. **Organization**: Manage 50+ contacts with full conversation history tracking
4. **Engagement**: Average user sends 3x more networking emails than with manual process

---

## 2. Goals & Non-Goals

### Goals ✅
- **Save Time**: Reduce email composition time by 80% with templates and automation
- **Improve Quality**: Ensure every email is personalized and professional
- **Reduce Stress**: Never miss a follow-up with automated reminders
- **Track Everything**: Full visibility into networking pipeline (who, when, status, next steps)
- **Automate Workflow**: Auto-update status, pre-fill templates, integrate Gmail
- **Build Habits**: Help students develop consistent, effective networking practices
- **Analytics**: Show students what's working (response rates, best templates, optimal timing)
- **Timeline Tracking**: Calendar view of recruiting deadlines and networking milestones

### Non-Goals ❌
- **NOT** a job application tracker (focus is networking/relationships, not application status)
- **NOT** a resume builder
- **NOT** a generic CRM for sales/marketing
- **NOT** LinkedIn messaging integration (Gmail only for Phase 1)

### Future Features (Phase 2+)
- Simple LinkedIn scraper (surface-level info only, following LinkedIn ToS)
- Email response tracking and analytics
- Team/club-level analytics for administrators
- Mobile app (Phase 1 is web-only)

---

## 3. Core Features - Spreadsheet Replacement System

### 3.1 Dual-View Organization (Option C)

#### Company-First View (Primary)
This view replicates and improves upon the traditional spreadsheet workflow students currently use.

**Layout**:
- Accordion/expandable cards for each company
- Company header displays:
  - Company name (bold, large)
  - Ranking badge (Heavy Target 🎯, Target 🔵, Lower Priority ⚪)
  - Progress summary (e.g., "3 contacts, 2 called, 1 pending")
  - Quick actions: ➕ Add Contact, 📝 Add Note, 🏷️ Update Ranking
- Expand company to reveal contact table with columns:
  - **Status** (color dot: 🔴 None → 🟡 Emailed → 🟢 Called)
  - **Name** (clickable to contact detail)
  - **Position** (Analyst, Associate, VP, etc.)
  - **Division/Tags** (chips: PDT, BAM, MIG, etc.)
  - **Last Contact** (date, hover for quick preview)
  - **Next Action** (e.g., "Follow up in 2 days")
  - **Quality** (⭐⭐⭐ Good, ⭐⭐ Okay, ⭐ Poor)
  - **Actions** (✉️ Email, 📞 Log Call, 📝 Add Note)

**Example (Moelis)**:
```
┌─────────────────────────────────────────────────────────────┐
│ 🏢 Moelis & Company                    🎯 Heavy Target    ▼ │
│ Progress: 3 contacts • 1 called • 2 emailed                 │
│ [➕ Add Contact] [📝 Add Note] [🏷️ Update Ranking]          │
├─────────────────────────────────────────────────────────────┤
│ Status │ Name              │ Position │ Tags      │ Last    │
├─────────────────────────────────────────────────────────────┤
│ 🟢     │ Sam Petersen      │ Analyst  │ PDT       │ 10/10   │
│ 🟡     │ Ryan Zimmerman    │ Analyst  │ PDT       │ 10/7    │
│ 🟡     │ Michael Boonshoft │ Analyst  │ BAM       │ 10/8    │
└─────────────────────────────────────────────────────────────┘
```

#### Contact-First View (Secondary)
Flat list of all contacts across all companies, optimized for cross-company follow-ups.

**Features**:
- Search bar (name, company, tags, notes)
- Filters:
  - Status (🔴 None, 🟡 Emailed, 🟢 Called)
  - Quality (⭐⭐⭐, ⭐⭐, ⭐)
  - Division/Tags (multi-select)
  - Date range (last contacted, next follow-up)
  - Company ranking (Heavy Target, Target, etc.)
- Sort by: Last contact, Next follow-up, Date added, Quality
- Bulk actions: Send batch follow-ups, Update tags, Export

**Example Card**:
```
┌─────────────────────────────────────────────────────┐
│ 🟢 Sam Petersen                              ⭐⭐⭐  │
│ Analyst @ Moelis & Company                          │
│ PDT • Event • Referral                              │
│ Last contact: 10/10/25 (Phone call)                │
│ Next: Follow up in 1 week                           │
│ [✉️ Email] [📞 Log Call] [📝 Note] [👁️ View]       │
└─────────────────────────────────────────────────────┘
```

**View Toggle**: Simple tab switcher in header
```
[ 🏢 Companies ] [ 👤 Contacts ]
```

---

### 3.2 Automation Improvements Over Spreadsheet

#### Auto-Status Updates
- **When email sent** → Status automatically updates 🔴 → 🟡, date auto-populated
- **When call logged** → Status automatically updates 🟡 → 🟢, date auto-populated
- **No manual status editing needed** (but can override if desired)

#### Integrated Email History
- Click contact → See full Gmail thread (pulled via OAuth)
- Send email directly from contact row (opens compose modal)
- Templates auto-populate with contact details (name, company, position)
- View sent emails inline, no more searching Gmail

#### Smart Reminders
- Set follow-up date → Automatic calendar reminder
- Dashboard widget: "5 contacts need follow-up this week"
- Overdue follow-ups highlighted in red
- Batch reminders: "You have 3 thank-you notes to send"

#### Tag System (Replaces Free-Text Fields)
**Problem**: Spreadsheet "Email Details" column has inconsistent free text (PDT, BAM, "AB referral", "Half-Hispanic", etc.)

**Solution**: Structured tagging system
- **Division Tags**: PDT, BAM, MIG, PDS, RX, ECM, DCM (predefined + custom)
- **Source Tags**: Event, Referral, Cold Email, Alumni, Club
- **Custom Tags**: Any user-created tag
- **Auto-suggestions**: As you type, suggest existing tags
- **Filter by tags**: Instant filtering, multi-select

**Example**: Instead of "PDT; AB referral; Half-Hispanic" → Tags: `PDT` `Referral` `Diversity`

#### Timeline Notes (Replaces Single-Line Fields)
**Problem**: Spreadsheet has one "Phone Call Details" field, losing interaction history

**Solution**: Chronological timeline per contact
- Add timestamped note after each interaction
- View full conversation history at a glance
- Example timeline:
  ```
  📞 10/10/25 3:30 PM - Phone call
  "Discussed PDT group. He suggested staying in touch and
  referred me to another Moelis analyst. Great conversation."

  ✉️ 10/7/25 9:15 AM - Email sent
  Used template: "Analyst Coffee Chat Request"

  📝 10/6/25 - Added to pipeline
  Met at Moelis networking event. Seemed interested in helping.
  ```

---

### 3.3 Data Model

#### Company Object
```javascript
{
  id: uuid,
  user_id: uuid,
  name: string,                    // "Moelis & Company"
  ranking: enum,                   // "Heavy Target", "Target", "Lower Priority"
  industry: string,                // "Investment Banking"
  sector: string,                  // "Financial Services"
  results_progress: text,          // Free text summary
  notes: text,                     // Company-level notes
  contacts: array<Contact>,        // 1-15+ contacts
  created_at: timestamp,
  updated_at: timestamp
}
```

#### Contact Object
```javascript
{
  id: uuid,
  user_id: uuid,
  company_id: uuid,                // Foreign key to Company
  name: string,                    // "Sam Petersen"
  position: string,                // "Analyst", "Associate", "VP"
  email: string,
  phone: string,
  status: enum,                    // "none", "emailed", "called"
  quality: enum,                   // "good", "okay", "poor", null
  tags: array<string>,             // ["PDT", "Event", "Referral"]

  // Dates
  email_date: timestamp,
  phone_date: timestamp,
  last_contact_date: timestamp,
  next_followup_date: timestamp,

  // History
  email_history: json,             // Gmail thread data
  timeline_notes: array<Note>,     // Chronological notes

  created_at: timestamp,
  updated_at: timestamp
}
```

#### Note Object
```javascript
{
  id: uuid,
  contact_id: uuid,
  user_id: uuid,
  type: enum,                      // "email", "call", "meeting", "general"
  content: text,
  created_at: timestamp
}
```

---

### 3.4 UI/UX Specifications

#### Visual Style
**Aesthetic**: Clean, professional, modern SaaS with financial sophistication (Bloomberg Terminal meets Notion)

**Color Palette**:
- **Primary**: Deep navy (#1E293B) - headers, primary buttons
- **Accent**: Amber/gold (#F59E0B) - "Heavy Target" badges, important CTAs
- **Status Colors**:
  - 🔴 Red (#EF4444) - None/No contact yet
  - 🟡 Yellow (#F59E0B) - Emailed
  - 🟢 Green (#10B981) - Called/Active
- **Neutrals**:
  - Background: Off-white (#F8FAFC)
  - Cards: White (#FFFFFF)
  - Borders: Light gray (#E2E8F0)
  - Text: Charcoal (#334155)

**Typography**:
- **Font**: Inter or SF Pro (clean, professional sans-serif)
- **Hierarchy**:
  - H1 (Company names): 24px, bold
  - H2 (Section headers): 18px, semibold
  - Body (Contact details): 14px, regular
  - Small (Dates, tags): 12px, medium

**Layout Style**: Airtable/Notion hybrid
- Spreadsheet feel with better UX
- Inline editing (click to edit)
- Hover actions (email, call, note buttons appear on row hover)
- Expandable sections (company accordion)

#### Key UI Components

**1. Status Indicator**
- Colored dot (12px circle) next to contact name
- Tooltip on hover: "Status: Emailed (10/7/25)"
- Click to manually override status

**2. Ranking Badge**
```
Heavy Target: 🎯 Amber badge with bold text
Target: 🔵 Blue badge with regular text
Lower Priority: ⚪ Gray badge with light text
```

**3. Tag Chips**
- Small, rounded rectangles
- Different colors per tag category (division = blue, source = green, custom = gray)
- Click to filter by tag
- "+" button to add more tags

**4. Quick Actions Bar** (appears on contact row hover)
```
[✉️ Email] [📞 Log Call] [📝 Add Note] [👁️ View Details]
```

**5. Contact Detail Modal** (click contact name)
- Full-screen overlay
- Left side: Contact info, tags, status
- Right side: Email history, timeline notes
- Bottom: Quick actions (send email, log call, set reminder)

---

## 4. Feature Prioritization (Phase 1)

### Must-Have (MVP)
1. ✅ **Authentication** (already built)
2. ✅ **Gmail OAuth integration** (already built)
3. ✅ **Email templates** (already built)
4. ✅ **Contact management** (already built)
5. **Company-first view with accordion layout** ⬅️ NEW
6. **Auto-status updates when emails sent** ⬅️ NEW
7. **Tag system for divisions/sources** ⬅️ NEW
8. **Timeline notes for each contact** ⬅️ NEW
9. **Quality rating system** ⬅️ NEW
10. **Follow-up reminder system** ⬅️ NEW

### Should-Have (Phase 1.5)
1. **Contact-first view with advanced filtering**
2. **Dashboard with metrics** ("5 follow-ups due", "10 emails sent this week")
3. **Bulk actions** (batch follow-ups, export contacts)
4. **Search across all contacts and notes**
5. **Email response tracking** (detect when someone replies)

### Nice-to-Have (Phase 2)
1. **Recruiting timeline/calendar view**
2. **Analytics dashboard** (response rates, best times to email, template performance)
3. **Simple LinkedIn scraper** (name, position, company only)
4. **Team/club-level features** (share contacts, aggregate analytics)
5. **Mobile responsive design**

---

## 5. User Flows

### Flow 1: Adding a New Contact from Event
1. User meets analyst at networking event
2. Opens app → Company view
3. Searches for "Moelis" or clicks existing company
4. Clicks "➕ Add Contact" button
5. Modal opens with form:
   - Name: "Sam Petersen"
   - Position: "Analyst" (dropdown)
   - Email: "sam.petersen@moelis.com"
   - Phone: "555-123-4567"
   - Tags: "PDT", "Event" (autocomplete)
   - Initial note: "Met at Moelis networking event. Discussed PDT group."
6. Clicks "Save" → Contact appears in Moelis accordion, status = 🔴 None

### Flow 2: Sending Initial Email
1. User opens Moelis company accordion
2. Hovers over Sam Petersen row → Quick actions appear
3. Clicks "✉️ Email" button
4. Email compose modal opens with:
   - Template selector (dropdown): "Analyst Coffee Chat Request"
   - Template auto-fills with: "Hi Sam," (name), "Moelis" (company), "Analyst" (position)
   - User customizes: Adds "PDT group" reference from notes
5. Clicks "Send" → Email sent via Gmail
6. Status auto-updates: 🔴 → 🟡, Email Date = Today
7. Timeline note auto-added: "✉️ Email sent - Analyst Coffee Chat Request"

### Flow 3: Logging Phone Call
1. User has call with Sam
2. Opens Sam's contact detail (click name)
3. Clicks "📞 Log Call" button
4. Modal with form:
   - Date/time: Pre-filled with now (editable)
   - Duration: 15 minutes
   - Quality: ⭐⭐⭐ Good (select)
   - Notes: "Discussed PDT group. He suggested staying in touch and referred me to another analyst."
   - Next follow-up: 1 week (sets reminder)
5. Clicks "Save"
6. Status auto-updates: 🟡 → 🟢, Phone Date = Today
7. Timeline updated with call note
8. Reminder set for 1 week from now

### Flow 4: Following Up (Reminder Triggered)
1. User opens app, sees dashboard notification: "3 follow-ups due this week"
2. Clicks notification → Filtered contact view showing 3 contacts
3. Selects Sam Petersen
4. Clicks "✉️ Email" → Template: "Follow-up After Call"
5. Auto-fills with details from last interaction
6. User customizes and sends
7. Last Contact Date updates, Next Follow-up resets

---

## 6. Technical Architecture

### Frontend (Already Built)
- **Framework**: React
- **Routing**: React Router
- **State**: Context API or Redux (check current implementation)
- **Styling**: Tailwind CSS (recommended for our clean, utility-first approach)

### Backend (Already Built)
- **Runtime**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + JWT
- **Email**: Gmail API via OAuth 2.0

### New Database Tables Needed

#### `companies` table
```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ranking TEXT CHECK (ranking IN ('Heavy Target', 'Target', 'Lower Priority')),
  industry TEXT,
  sector TEXT,
  results_progress TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `contacts` table (MODIFY EXISTING)
```sql
ALTER TABLE contacts ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE contacts ADD COLUMN position TEXT;
ALTER TABLE contacts ADD COLUMN phone TEXT;
ALTER TABLE contacts ADD COLUMN status TEXT DEFAULT 'none' CHECK (status IN ('none', 'emailed', 'called'));
ALTER TABLE contacts ADD COLUMN quality TEXT CHECK (quality IN ('good', 'okay', 'poor'));
ALTER TABLE contacts ADD COLUMN tags TEXT[]; -- Array of tag strings
ALTER TABLE contacts ADD COLUMN email_date TIMESTAMP;
ALTER TABLE contacts ADD COLUMN phone_date TIMESTAMP;
ALTER TABLE contacts ADD COLUMN last_contact_date TIMESTAMP;
ALTER TABLE contacts ADD COLUMN next_followup_date TIMESTAMP;
ALTER TABLE contacts ADD COLUMN email_history JSONB; -- Gmail thread data
```

#### `timeline_notes` table (NEW)
```sql
CREATE TABLE timeline_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('email', 'call', 'meeting', 'general')),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints (New)

#### Companies
- `POST /api/companies` - Create company
- `GET /api/companies` - List all companies for user
- `GET /api/companies/:id` - Get company with all contacts
- `PUT /api/companies/:id` - Update company
- `DELETE /api/companies/:id` - Delete company

#### Contacts (Modify Existing)
- `POST /api/contacts` - Create contact (add company_id, tags, etc.)
- `GET /api/contacts` - List all contacts (add filtering by status, quality, tags)
- `GET /api/contacts/:id` - Get contact with timeline
- `PUT /api/contacts/:id` - Update contact
- `PUT /api/contacts/:id/status` - Update status (auto-triggered on email/call)

#### Timeline Notes
- `POST /api/contacts/:id/notes` - Add timeline note
- `GET /api/contacts/:id/notes` - Get all notes for contact
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note

#### Email Integration (Modify Existing)
- `POST /api/gmail/send` - Modify to also update contact status + create timeline note
- `GET /api/gmail/threads/:contactId` - Fetch email history for contact

---

## 7. Open Questions & Decisions Needed

### Questions for User
1. **Ranking System**: Are "Heavy Target", "Target", "Lower Priority" the only 3 levels, or do you want more granularity?
2. **Division Tags**: Should we pre-populate common IB divisions (PDT, BAM, MIG, ECM, DCM, RX, etc.) or let users create all tags custom?
3. **Reminders**: Where should reminders appear? (Dashboard widget only, email notifications, browser notifications?)
4. **Email History**: Should we fetch full Gmail threads automatically, or only when user clicks "View History"? (Performance consideration)
5. **Bulk Import**: Do you want ability to import existing spreadsheet data? (CSV upload)
6. **Export**: Should users be able to export data back to spreadsheet format?

### Technical Decisions
1. **State Management**: Upgrade to Redux for complex contact/company state, or keep Context API?
2. **Real-time Updates**: Use Supabase real-time subscriptions for live updates?
3. **Caching**: Cache Gmail API responses to reduce API quota usage?
4. **Search**: Use PostgreSQL full-text search or integrate Algolia/MeiliSearch for faster search?

---

## 8. Success Criteria

### Phase 1 Launch Criteria
- [ ] User can create companies and add contacts
- [ ] Company-first view displays all contacts grouped by company
- [ ] Sending email auto-updates contact status to "Emailed"
- [ ] Logging call auto-updates contact status to "Called"
- [ ] Tags can be added to contacts and used for filtering
- [ ] Timeline notes display chronologically per contact
- [ ] Quality ratings can be set and displayed
- [ ] Follow-up reminders appear on dashboard
- [ ] All existing features (auth, templates, Gmail) continue working

### User Testing Goals
- New user can add 5 companies + 15 contacts in under 10 minutes
- User can send personalized email in under 90 seconds (vs. 5+ minutes with spreadsheet)
- 95% of users prefer app over spreadsheet after 1 week trial
- Zero critical bugs in email sending (Gmail integration must be bulletproof)

### Performance Targets
- Page load: < 2 seconds
- Email send: < 3 seconds end-to-end
- Search results: < 500ms
- Support 100+ contacts per user without slowdown

---

## 9. Risks & Mitigations

### Risk 1: Gmail API Quota Limits
**Risk**: Heavy users may hit daily Gmail API quotas (sending limits, read limits)
**Mitigation**:
- Cache email thread data in database
- Implement rate limiting on frontend
- Show quota usage to user
- Upgrade to Google Workspace if needed (higher quotas)

### Risk 2: User Resistance to Change from Spreadsheet
**Risk**: Students love Excel/Sheets, may resist new tool
**Mitigation**:
- Make UI feel like spreadsheet (Airtable-style)
- Offer CSV import from existing spreadsheets
- Provide export to spreadsheet option
- Emphasize time savings in onboarding

### Risk 3: Data Loss
**Risk**: Users losing critical networking data is unacceptable
**Mitigation**:
- Automated daily backups (Supabase built-in)
- Export to CSV feature
- Soft deletes (trash bin, 30-day recovery)
- Robust error handling on all write operations

### Risk 4: Club Adoption (B2B2C Model)
**Risk**: Clubs may not adopt or distribute to members
**Mitigation**:
- Offer free tier for club admins to test
- Provide club-level analytics dashboard
- Create simple onboarding materials for clubs to share
- Testimonials from early adopter clubs

---

## 10. Next Steps

### Immediate (Next Session)
1. ✅ Review and finalize PRD
2. Create UI wireframes/mockups for Company-First View
3. Design database migration plan (add new tables/columns)
4. Prioritize which Phase 1 features to build first

### Short-Term (Next 2 Weeks)
1. Implement `companies` table and API endpoints
2. Modify `contacts` table with new fields
3. Build Company-First View UI (accordion layout)
4. Implement auto-status updates on email send

### Medium-Term (Next Month)
1. Build tag system (UI + backend)
2. Implement timeline notes feature
3. Create follow-up reminder system
4. Build Contact-First View with filtering

### Long-Term (Next Quarter)
1. User testing with 2-3 student clubs
2. Iterate based on feedback
3. Build analytics dashboard
4. Plan Phase 2 features (calendar, LinkedIn scraper)

---

## Appendix: Inspiration & References

### UI Inspiration
- **Airtable**: Spreadsheet + database hybrid, inline editing
- **Notion**: Clean aesthetic, accordion sections, tags
- **Linear**: Fast, keyboard shortcuts, modern design
- **Bloomberg Terminal**: Professional, information-dense (but cleaner)

### Competitive Analysis
- **Generic CRMs** (Salesforce, HubSpot): Too complex, sales-focused
- **Huntr**: Job application tracking, but not networking-focused
- **Notion/Airtable**: Flexible but requires manual setup, no Gmail integration
- **Our Edge**: Purpose-built for student recruiting, Gmail integration, auto-status, reminders

### User Research Notes
- Users currently spend 5-10 minutes per email (finding template, copying contact info, personalizing)
- 60% of students forget to send follow-up emails
- Average IB recruit networks with 30-50 people per semester
- Students value speed and reliability over fancy features

---

**Document Version**: 1.0
**Last Updated**: 2025-11-16
**Next Review**: After UI wireframes complete
