# Contact Fields for IB Networking App

## Field Structure

### Basic Information
1. **Name** (required)
   - Text input
   - Required field

2. **Position/Title**
   - Text input
   - Optional

3. **Email**
   - Email input
   - Optional

4. **Phone Number**
   - Tel input
   - Field: `phone`
   - Optional

5. **Company**
   - Dropdown select from companies table
   - Field: `company_id`
   - Optional - also shows "+ Add New Company" option

### Communication Tracking

6. **Status**
   - Dropdown: none / emailed / called
   - Default: "none"
   - Display with text labels + icons (not just colored emojis):
     - none: "🔴 Not Contacted"
     - emailed: "📧 Emailed"
     - called: "📞 Called"

7. **Connection Quality**
   - Dropdown: good / okay / poor
   - Field: `quality`
   - Optional
   - Display as stars:
     - good: ⭐⭐⭐
     - okay: ⭐⭐
     - poor: ⭐

8. **Most Recent Email Date**
   - Date input
   - Field: `email_date`
   - User can manually set this
   - Optional

9. **Call Date**
   - Date input
   - Field: `phone_date`
   - User can manually set this
   - Optional

### Notes (All textarea inputs)

10. **Notes on Person**
    - Field: `notes`
    - General notes about the person
    - Textarea
    - Optional

11. **Email Details/Notes**
    - Field: `email_notes`
    - Notes specific to email communications
    - Textarea
    - Optional

12. **Phone Call Details**
    - Field: `call_notes`
    - Notes specific to phone calls
    - Textarea
    - Optional

## Implementation Notes

- All fields manual entry for MVP (no auto-updates)
- Status should show as text + icon, not just colored emojis
- Email date and call date are manually entered by user
- Three separate note fields for different purposes
- Quality shows as star ratings in display
