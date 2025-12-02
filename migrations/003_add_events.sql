-- Migration 003: Add Events and Google Calendar Integration
-- Run this in Supabase SQL Editor to add calendar event features

-- ==================== EVENTS TABLE ====================
CREATE TABLE public.events (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES public.companies(id) ON DELETE CASCADE,
    contact_id INTEGER REFERENCES public.contacts(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) CHECK (event_type IN ('coffee_chat', 'info_session', 'interview', 'networking', 'follow_up', 'other')),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    location VARCHAR(255),
    google_calendar_id VARCHAR(255), -- Store Google Calendar event ID for sync
    google_calendar_link TEXT, -- Direct link to event in Google Calendar
    synced_to_google BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== UPDATE USERS TABLE ====================
-- Add Google Calendar sync preference
ALTER TABLE public.users
    ADD COLUMN google_calendar_sync_enabled BOOLEAN DEFAULT false,
    ADD COLUMN google_calendar_id VARCHAR(255); -- Primary calendar ID

-- ==================== INDEXES ====================
CREATE INDEX idx_events_user_id ON public.events(user_id);
CREATE INDEX idx_events_company_id ON public.events(company_id);
CREATE INDEX idx_events_contact_id ON public.events(contact_id);
CREATE INDEX idx_events_start_time ON public.events(start_time);
CREATE INDEX idx_events_google_calendar_id ON public.events(google_calendar_id);

-- ==================== ROW LEVEL SECURITY ====================
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events
CREATE POLICY "Users can view own events" ON public.events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own events" ON public.events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events" ON public.events
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events" ON public.events
    FOR DELETE USING (auth.uid() = user_id);

-- ==================== TRIGGERS ====================
-- Auto-update updated_at for events
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== HELPER FUNCTIONS ====================

-- Function to get upcoming events for a company
CREATE OR REPLACE FUNCTION get_company_upcoming_events(company_id_param INTEGER)
RETURNS TABLE (
    id INTEGER,
    title VARCHAR,
    event_type VARCHAR,
    start_time TIMESTAMPTZ,
    contact_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.title,
        e.event_type,
        e.start_time,
        c.name as contact_name
    FROM public.events e
    LEFT JOIN public.contacts c ON e.contact_id = c.id
    WHERE e.company_id = company_id_param
        AND e.start_time >= NOW()
    ORDER BY e.start_time ASC
    LIMIT 3;
END;
$$ LANGUAGE plpgsql;

-- Function to get all upcoming events for a user
CREATE OR REPLACE FUNCTION get_user_upcoming_events(user_id_param UUID, days_ahead INTEGER DEFAULT 30)
RETURNS TABLE (
    id INTEGER,
    title VARCHAR,
    event_type VARCHAR,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    company_name VARCHAR,
    contact_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.title,
        e.event_type,
        e.start_time,
        e.end_time,
        co.name as company_name,
        c.name as contact_name
    FROM public.events e
    LEFT JOIN public.companies co ON e.company_id = co.id
    LEFT JOIN public.contacts c ON e.contact_id = c.id
    WHERE e.user_id = user_id_param
        AND e.start_time >= NOW()
        AND e.start_time <= NOW() + (days_ahead || ' days')::INTERVAL
    ORDER BY e.start_time ASC;
END;
$$ LANGUAGE plpgsql;

-- ==================== SAMPLE DATA (Optional - for testing) ====================
-- Uncomment to add sample events for testing

-- INSERT INTO public.events (user_id, company_id, title, event_type, start_time, end_time, description) VALUES
--     ((SELECT id FROM public.users LIMIT 1),
--      (SELECT id FROM public.companies WHERE name = 'Goldman Sachs' LIMIT 1),
--      'Coffee Chat with John Smith',
--      'coffee_chat',
--      NOW() + INTERVAL '2 days',
--      NOW() + INTERVAL '2 days' + INTERVAL '30 minutes',
--      'Networking coffee chat to discuss M&A opportunities'),
--     ((SELECT id FROM public.users LIMIT 1),
--      (SELECT id FROM public.companies WHERE name = 'Moelis & Company' LIMIT 1),
--      'Info Session - Tech Banking',
--      'info_session',
--      NOW() + INTERVAL '5 days',
--      NOW() + INTERVAL '5 days' + INTERVAL '1 hour',
--      'Learn about tech banking opportunities at Moelis');
