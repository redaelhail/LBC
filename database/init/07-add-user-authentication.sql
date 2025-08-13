-- Add authentication fields to users table
-- 07-add-user-authentication.sql

-- Create user role enum
CREATE TYPE user_role AS ENUM ('admin', 'compliance_officer', 'analyst', 'viewer');

-- Update users table with authentication and role fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'viewer',
ADD COLUMN IF NOT EXISTS organization VARCHAR(255),
ADD COLUMN IF NOT EXISTS department VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- Create audit_logs table for compliance tracking
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    extra_data JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);

-- Create a default admin user (password: admin123)
-- Hash for 'admin123' using bcrypt - proper hash format
INSERT INTO users (username, email, hashed_password, full_name, role, is_superuser, is_active) 
VALUES (
    'admin',
    'admin@sanctionsguard.com',
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', -- admin123
    'System Administrator',
    'admin',
    true,
    true
) ON CONFLICT (email) DO NOTHING;