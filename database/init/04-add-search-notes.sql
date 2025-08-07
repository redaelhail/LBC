-- Add notes column to search_history table for general search notes
ALTER TABLE search_history ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for notes column to improve search performance
CREATE INDEX IF NOT EXISTS idx_search_history_notes ON search_history USING gin(to_tsvector('english', notes));