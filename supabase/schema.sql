-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUMs for strict type checking at the DB level
CREATE TYPE user_role AS ENUM ('resident', 'admin');
CREATE TYPE complaint_priority AS ENUM ('low', 'medium', 'high', 'emergency');
CREATE TYPE complaint_status AS ENUM ('submitted', 'verified', 'assigned', 'in_progress', 'resolved', 'closed');

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'resident',
    phone VARCHAR(20),
    house_number VARCHAR(50),
    block VARCHAR(50),
    floor INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Categories Table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Complaints Table
CREATE TABLE complaints (
    id VARCHAR(50) PRIMARY KEY, -- Format: MAC-B204-YYYYMMDD-XXX
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    priority complaint_priority NOT NULL DEFAULT 'medium',
    status complaint_status NOT NULL DEFAULT 'submitted',
    resident_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    house_number VARCHAR(50) NOT NULL,
    block VARCHAR(50) NOT NULL,
    floor INTEGER,
    image_url VARCHAR(512),
    contact_number VARCHAR(20) NOT NULL,
    re_raised_count INTEGER NOT NULL DEFAULT 0,
    last_status_change_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Complaint Status Logs Table (Audit Trail)
CREATE TABLE complaint_status_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id VARCHAR(50) REFERENCES complaints(id) ON DELETE CASCADE NOT NULL,
    from_status complaint_status,
    to_status complaint_status NOT NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Notifications Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    complaint_id VARCHAR(50) REFERENCES complaints(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Announcements Table
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_complaints_resident ON complaints(resident_id);
CREATE INDEX idx_complaints_admin ON complaints(assigned_admin_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_priority ON complaints(priority);
CREATE INDEX idx_status_logs_complaint ON complaint_status_logs(complaint_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE is_read = FALSE;

-- Trigger function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_users_modtime
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_complaints_modtime
    BEFORE UPDATE ON complaints
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_modtime
    BEFORE UPDATE ON announcements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Seed Categories (As requested in AGENTS.md: Electrical, Water, Garbage, Road, Streetlight, Security, Lift, Parking, Gardening, Cleaning, Drainage, Others)
INSERT INTO categories (name, description) VALUES
('Electrical', 'Issues related to power cuts, meter problems, wiring, transformer issues, etc.'),
('Water', 'Issues with water supply, leakage, water meters, borewells, tankers, etc.'),
('Garbage', 'Garbage collection delay, dumpsters, waste disposal issues.'),
('Road', 'Potholes, layout roads, paving blocks, speed bumps, etc.'),
('Streetlight', 'Non-functioning streetlights, timing issues, new light installation.'),
('Security', 'Security guards, gate operations, CCTV cameras, trespassing, etc.'),
('Lift', 'Elevator breakdowns, maintenance issues, passenger stuck incidents.'),
('Parking', 'Wrongful parking, visitor parking allocation, parking spot conflicts.'),
('Gardening', 'Trimming trees, maintaining parks, watering community gardens, etc.'),
('Cleaning', 'Common area cleaning, corridor sweeping, clubhouse hygiene.'),
('Drainage', 'Sewer lines, clogged pipes, water-logging, rain water harvesting, etc.'),
('Others', 'Any other issues that do not fit standard categories.');
