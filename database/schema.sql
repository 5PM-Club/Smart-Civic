-- Enable PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Departments Table
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Workers Table
CREATE TABLE workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    phone_type TEXT DEFAULT 'personal', -- 'personal' or 'work'
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Citizens Table
CREATE TABLE citizens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL UNIQUE,
    name TEXT,
    preferred_language TEXT DEFAULT 'en', -- 'en', 'hi', 'local'
    badge TEXT DEFAULT 'citizen', -- 'citizen', 'super_citizen', 'local_hero'
    complaint_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. SLA Config Table
CREATE TABLE sla_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL UNIQUE,
    deadline_hours INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Default SLA Configs
INSERT INTO sla_config (category, deadline_hours) VALUES
('garbage', 24),
('pothole', 72),
('drainage', 48),
('water_leak', 48),
('streetlight', 120);

-- 5. Complaints Table
CREATE TYPE complaint_status AS ENUM ('open', 'assigned', 'in_progress', 'resolved', 'escalated');

CREATE TABLE complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id TEXT NOT NULL UNIQUE, -- e.g. CMP-2026-00001
    category TEXT REFERENCES sla_config(category),
    description TEXT,
    photo_url TEXT,
    completion_photo_url TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    location GEOGRAPHY(POINT, 4326),
    location_source TEXT, -- 'gps', 'exif', 'pincode', 'ward'
    address_ward TEXT,
    channel TEXT DEFAULT 'whatsapp', -- 'whatsapp', 'sms', 'ivr', 'web'
    status complaint_status DEFAULT 'open',
    citizen_id UUID REFERENCES citizens(id),
    worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    sla_deadline TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update Location Trigger (syncs lat/lng to postgis geometry)
CREATE OR REPLACE FUNCTION sync_complaint_location()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
        NEW.location = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
    END IF;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_complaint_location
BEFORE INSERT OR UPDATE ON complaints
FOR EACH ROW EXECUTE FUNCTION sync_complaint_location();

-- 6. Status History Table
CREATE TABLE status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
    status complaint_status NOT NULL,
    notes TEXT,
    changed_by_role TEXT, -- 'system', 'citizen', 'worker', 'admin'
    changed_by_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Trigger to Auto-add Status History on Complaint Insert or Status Update
CREATE OR REPLACE FUNCTION log_complaint_status()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') OR ((TG_OP = 'UPDATE') AND (OLD.status IS DISTINCT FROM NEW.status)) THEN
        INSERT INTO status_history (complaint_id, status, notes, changed_by_role)
        VALUES (NEW.id, NEW.status, 'Status update logged', 'system');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_status_change
AFTER INSERT OR UPDATE ON complaints
FOR EACH ROW EXECUTE FUNCTION log_complaint_status();

-- 8. Basic RLS enablement (Policies can be expanded as needed)
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE citizens ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;

-- 9. Increment Complaint Count RPC
CREATE OR REPLACE FUNCTION increment_complaint_count(citizen_id_param UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE citizens
    SET complaint_count = complaint_count + 1
    WHERE id = citizen_id_param;
END;
$$ LANGUAGE plpgsql;

-- 10. Update resolved_at automatically
CREATE OR REPLACE FUNCTION set_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
        NEW.resolved_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_resolved_at
BEFORE UPDATE ON complaints
FOR EACH ROW EXECUTE FUNCTION set_resolved_at();
