-- Add notes column to starred_entities table for compliance observations
ALTER TABLE starred_entities ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for notes column to improve search performance
CREATE INDEX IF NOT EXISTS idx_starred_entities_notes ON starred_entities USING gin(to_tsvector('english', notes)) WHERE notes IS NOT NULL;