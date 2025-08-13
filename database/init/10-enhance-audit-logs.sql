-- Enhance audit_logs table with comprehensive tracking fields
-- 10-enhance-audit-logs.sql

-- Add new columns for enhanced audit trail
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
ADD COLUMN IF NOT EXISTS resource_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17),
ADD COLUMN IF NOT EXISTS session_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS risk_level VARCHAR(10) DEFAULT 'LOW';

-- Create additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success);
CREATE INDEX IF NOT EXISTS idx_audit_logs_risk_level ON audit_logs(risk_level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs(session_id);

-- Create index for security monitoring (failed actions)
CREATE INDEX IF NOT EXISTS idx_audit_logs_security_failures ON audit_logs(success, risk_level, timestamp) 
WHERE success = false OR risk_level IN ('MEDIUM', 'HIGH');

-- Update existing audit_logs to have proper category and risk_level
UPDATE audit_logs 
SET 
    category = CASE
        WHEN action IN ('LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGE') THEN 'AUTHENTICATION'
        WHEN action IN ('SEARCH_ENTITIES', 'SEARCH_BATCH') THEN 'SEARCH'
        WHEN action IN ('EXPORT_PDF', 'EXPORT_CSV') THEN 'DATA_EXPORT'
        WHEN action IN ('BLACKLIST_ADD', 'BLACKLIST_REMOVE') THEN 'SECURITY'
        ELSE 'SYSTEM'
    END,
    risk_level = CASE
        WHEN action IN ('DELETE_USER', 'ROLE_CHANGE', 'BLACKLIST_REMOVE', 'LOGIN_FAILED') THEN 'HIGH'
        WHEN action IN ('CREATE_USER', 'UPDATE_USER', 'BLACKLIST_ADD', 'EXPORT_PDF') THEN 'MEDIUM'
        ELSE 'LOW'
    END
WHERE category IS NULL OR category = 'SYSTEM';