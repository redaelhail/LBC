-- Rename risk_score to relevance_score in search_history and starred_entities tables
-- This migration changes the terminology from "risk score" to "relevance score"

-- Update search_history table
ALTER TABLE search_history RENAME COLUMN risk_score TO relevance_score;

-- Update starred_entities table  
ALTER TABLE starred_entities RENAME COLUMN risk_score TO relevance_score;

-- Add comment to clarify what relevance_score represents
COMMENT ON COLUMN search_history.relevance_score IS 'OpenSanctions relevance score (0-100) based on search query match';
COMMENT ON COLUMN starred_entities.relevance_score IS 'OpenSanctions relevance score (0-100) based on search query match';