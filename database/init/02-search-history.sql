-- Create users table (basic structure)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create search_history table
CREATE TABLE IF NOT EXISTS search_history (
    id SERIAL PRIMARY KEY,
    query VARCHAR(500) NOT NULL,
    search_type VARCHAR(50) DEFAULT 'Person',
    results_count INTEGER DEFAULT 0,
    risk_level VARCHAR(20) DEFAULT 'LOW',
    risk_score FLOAT DEFAULT 0.0,
    data_source VARCHAR(50) DEFAULT 'opensanctions',
    execution_time_ms INTEGER DEFAULT 0,
    results_data JSONB,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create search_notes table
CREATE TABLE IF NOT EXISTS search_notes (
    id SERIAL PRIMARY KEY,
    search_history_id INTEGER NOT NULL REFERENCES search_history(id) ON DELETE CASCADE,
    entity_id VARCHAR(255) NOT NULL,
    entity_name VARCHAR(255) NOT NULL,
    note_text TEXT NOT NULL,
    risk_assessment TEXT,
    action_taken TEXT,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create starred_entities table for individual entity starring
CREATE TABLE IF NOT EXISTS starred_entities (
    id SERIAL PRIMARY KEY,
    search_history_id INTEGER NOT NULL REFERENCES search_history(id) ON DELETE CASCADE,
    entity_id VARCHAR(255) NOT NULL,
    entity_name VARCHAR(255) NOT NULL,
    entity_data JSONB NOT NULL,  -- Store complete entity information
    risk_score FLOAT DEFAULT 0.0,
    risk_level VARCHAR(20) DEFAULT 'LOW',
    tags VARCHAR(500),
    user_id INTEGER REFERENCES users(id),
    starred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(entity_id, search_history_id)  -- Prevent duplicate stars for same entity in same search
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at);
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_risk_level ON search_history(risk_level);
CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(query);

CREATE INDEX IF NOT EXISTS idx_starred_entities_entity_id ON starred_entities(entity_id);
CREATE INDEX IF NOT EXISTS idx_starred_entities_search_history_id ON starred_entities(search_history_id);
CREATE INDEX IF NOT EXISTS idx_starred_entities_user_id ON starred_entities(user_id);
CREATE INDEX IF NOT EXISTS idx_starred_entities_starred_at ON starred_entities(starred_at);

CREATE INDEX IF NOT EXISTS idx_search_notes_search_history_id ON search_notes(search_history_id);
CREATE INDEX IF NOT EXISTS idx_search_notes_entity_id ON search_notes(entity_id);
CREATE INDEX IF NOT EXISTS idx_search_notes_user_id ON search_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_search_notes_created_at ON search_notes(created_at);

-- Insert default user for testing
INSERT INTO users (email, username, hashed_password, full_name, is_active, is_superuser) 
VALUES ('admin@sanctionsguard.com', 'admin', 'hashed_password_here', 'System Administrator', TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

-- Insert some sample search history data for testing
INSERT INTO search_history (query, search_type, results_count, risk_level, risk_score, data_source, execution_time_ms, user_id, results_data) 
VALUES 
    ('Vladimir Putin', 'Person', 5, 'HIGH', 95.0, 'opensanctions', 1200, 1, '[{"id": "putin-1", "caption": "Vladimir Putin", "schema": "Person", "properties": {"country": ["RU"], "topics": ["sanction"]}}]'::jsonb),
    ('Atlas Bank Morocco', 'Company', 0, 'LOW', 5.0, 'opensanctions', 890, 1, '[]'::jsonb),
    ('Donald Trump', 'Person', 3, 'MEDIUM', 65.0, 'mock', 1500, 1, '[{"id": "trump-1", "caption": "Donald Trump", "schema": "Person", "properties": {"country": ["US"], "topics": ["pep"]}}]'::jsonb),
    ('OFAC', 'Organization', 12, 'HIGH', 90.0, 'opensanctions', 2100, 1, '[{"id": "ofac-1", "caption": "OFAC", "schema": "Organization", "properties": {"country": ["US"], "topics": ["sanction"]}}]'::jsonb)
ON CONFLICT DO NOTHING;

-- Insert some sample notes
INSERT INTO search_notes (search_history_id, entity_id, entity_name, note_text, risk_assessment, action_taken, user_id)
VALUES 
    (1, 'putin-1', 'Vladimir Putin', 'High-risk individual under multiple sanctions. Transaction blocked.', 'Confirmed high risk due to ongoing sanctions', 'Transaction rejected', 1),
    (3, 'trump-1', 'Donald Trump', 'Former US President, PEP status confirmed. Additional due diligence required.', 'Medium risk due to PEP status', 'Enhanced monitoring applied', 1)
ON CONFLICT DO NOTHING;