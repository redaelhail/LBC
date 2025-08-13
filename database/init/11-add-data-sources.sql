-- Add data source management tables
-- 11-add-data-sources.sql

-- Data sources configuration table
CREATE TABLE IF NOT EXISTS data_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    url TEXT NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- sanctions, pep, watchlist, etc.
    format VARCHAR(20) DEFAULT 'json', -- json, xml, csv
    authentication_method VARCHAR(20) DEFAULT 'none', -- none, api_key, oauth, basic
    api_key VARCHAR(500), -- Encrypted API key
    headers JSON, -- Additional headers
    update_frequency INTEGER DEFAULT 24, -- Hours between updates
    priority INTEGER DEFAULT 1, -- 1 = highest priority
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data source synchronization logs
CREATE TABLE IF NOT EXISTS data_source_sync_logs (
    id SERIAL PRIMARY KEY,
    data_source_id INTEGER REFERENCES data_sources(id) ON DELETE CASCADE,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    success BOOLEAN DEFAULT false,
    error_message TEXT,
    total_records INTEGER DEFAULT 0,
    new_records INTEGER DEFAULT 0,
    updated_records INTEGER DEFAULT 0,
    deleted_records INTEGER DEFAULT 0,
    duration_seconds INTEGER,
    triggered_by VARCHAR(255), -- user_id or 'system'
    metadata JSON -- Additional sync metadata
);

-- Entity source tracking for provenance
CREATE TABLE IF NOT EXISTS entity_sources (
    id SERIAL PRIMARY KEY,
    entity_id VARCHAR(255) NOT NULL,
    data_source_id INTEGER REFERENCES data_sources(id) ON DELETE CASCADE,
    source_entity_id VARCHAR(255) NOT NULL,
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    entity_hash VARCHAR(32), -- MD5 hash for change detection
    raw_data JSON, -- Original entity data from source
    normalized_data JSON, -- Normalized entity data
    is_active BOOLEAN DEFAULT true
);

-- Data source metrics and statistics
CREATE TABLE IF NOT EXISTS data_source_metrics (
    id SERIAL PRIMARY KEY,
    data_source_id INTEGER REFERENCES data_sources(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    total_entities INTEGER DEFAULT 0,
    active_entities INTEGER DEFAULT 0,
    new_entities_today INTEGER DEFAULT 0,
    updated_entities_today INTEGER DEFAULT 0,
    sync_count_today INTEGER DEFAULT 0,
    avg_sync_duration INTEGER DEFAULT 0, -- seconds
    success_rate INTEGER DEFAULT 100, -- percentage
    last_error TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_data_sources_name ON data_sources(name);
CREATE INDEX IF NOT EXISTS idx_data_sources_type ON data_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_data_sources_enabled ON data_sources(enabled);

CREATE INDEX IF NOT EXISTS idx_sync_logs_data_source ON data_source_sync_logs(data_source_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON data_source_sync_logs(started_at);
CREATE INDEX IF NOT EXISTS idx_sync_logs_success ON data_source_sync_logs(success);

CREATE INDEX IF NOT EXISTS idx_entity_sources_entity_id ON entity_sources(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_sources_data_source ON entity_sources(data_source_id);
CREATE INDEX IF NOT EXISTS idx_entity_sources_hash ON entity_sources(entity_hash);
CREATE INDEX IF NOT EXISTS idx_entity_sources_active ON entity_sources(is_active);

CREATE INDEX IF NOT EXISTS idx_metrics_data_source ON data_source_metrics(data_source_id);
CREATE INDEX IF NOT EXISTS idx_metrics_date ON data_source_metrics(metric_date);

-- Insert default data sources
INSERT INTO data_sources (name, url, source_type, update_frequency, priority, enabled) VALUES
('OpenSanctions', 'https://api.opensanctions.org', 'sanctions', 6, 1, true),
('CNASNU', 'https://api.cnasnu.ma/v1/sanctions', 'sanctions', 6, 2, false), -- Placeholder URL
('EU_Sanctions', 'https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content', 'sanctions', 24, 3, false),
('Moroccan_PEP', 'https://api.transparency.ma/v1/pep', 'pep', 168, 4, false), -- Placeholder URL
('OFAC_SDN', 'https://api.treasury.gov/v1/sdn', 'sanctions', 12, 5, false) -- Placeholder URL
ON CONFLICT (name) DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_data_sources_updated_at 
    BEFORE UPDATE ON data_sources 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();