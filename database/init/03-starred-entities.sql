-- Add starred_entities table if it doesn't exist (migration)
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

-- Create indexes for starred_entities if they don't exist
CREATE INDEX IF NOT EXISTS idx_starred_entities_entity_id ON starred_entities(entity_id);
CREATE INDEX IF NOT EXISTS idx_starred_entities_search_history_id ON starred_entities(search_history_id);
CREATE INDEX IF NOT EXISTS idx_starred_entities_user_id ON starred_entities(user_id);
CREATE INDEX IF NOT EXISTS idx_starred_entities_starred_at ON starred_entities(starred_at);