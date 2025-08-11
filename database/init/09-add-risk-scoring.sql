-- Add risk scoring system tables
-- 09-add-risk-scoring.sql

-- Create risk level enum
CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high', 'critical');

-- Create score type enum
CREATE TYPE score_type AS ENUM ('inherent_risk', 'risk_management_device', 'net_risk');

-- Create score status enum
CREATE TYPE score_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'archived');

-- Create risk scores table
CREATE TABLE IF NOT EXISTS risk_scores (
    id SERIAL PRIMARY KEY,
    
    -- Entity Relationship
    entity_id INTEGER NOT NULL REFERENCES supervised_entities(id) ON DELETE CASCADE,
    
    -- Scoring Information
    score_type score_type NOT NULL,
    score_value DECIMAL(5,2) NOT NULL CHECK (score_value >= 0 AND score_value <= 100),
    risk_level risk_level NOT NULL,
    scoring_period VARCHAR(50),
    scoring_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Domain-specific scores (JSON structure for flexibility)
    domain_scores JSONB,
    
    -- Calculation Details
    calculation_method VARCHAR(100),
    weighting_factors JSONB,
    base_indicators JSONB,
    
    -- Review and Validation
    status score_status DEFAULT 'draft',
    reviewed_by INTEGER REFERENCES users(id),
    review_date TIMESTAMP,
    approved_by INTEGER REFERENCES users(id),
    approval_date TIMESTAMP,
    
    -- Expert Adjustments
    expert_adjustment DECIMAL(5,2) DEFAULT 0.0 CHECK (expert_adjustment >= -100 AND expert_adjustment <= 100),
    adjustment_reason TEXT,
    adjusted_by INTEGER REFERENCES users(id),
    adjustment_date TIMESTAMP,
    
    -- Comments and Documentation
    analyst_comments TEXT,
    management_comments TEXT,
    regulatory_notes TEXT,
    
    -- Version Control
    version INTEGER DEFAULT 1,
    previous_score_id INTEGER REFERENCES risk_scores(id),
    is_current BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create scoring domains table
CREATE TABLE IF NOT EXISTS scoring_domains (
    id SERIAL PRIMARY KEY,
    
    -- Domain Definition
    domain_name VARCHAR(100) NOT NULL UNIQUE,
    domain_code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50),
    
    -- Weighting and Configuration
    default_weight DECIMAL(5,2) DEFAULT 1.0,
    applicable_entity_types JSONB,
    
    -- Scoring Criteria
    scoring_criteria JSONB,
    maturity_scale JSONB,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    version INTEGER DEFAULT 1,
    
    -- Metadata
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create scoring domain analyses table
CREATE TABLE IF NOT EXISTS scoring_domain_analyses (
    id SERIAL PRIMARY KEY,
    
    -- Relationships
    risk_score_id INTEGER NOT NULL REFERENCES risk_scores(id) ON DELETE CASCADE,
    domain_id INTEGER NOT NULL REFERENCES scoring_domains(id),
    
    -- Scoring Details
    domain_score DECIMAL(5,2) NOT NULL CHECK (domain_score >= 0 AND domain_score <= 100),
    weight_applied DECIMAL(5,2) DEFAULT 1.0,
    weighted_score DECIMAL(5,2),
    
    -- Analysis Content
    findings TEXT,
    strengths TEXT,
    weaknesses TEXT,
    recommendations TEXT,
    
    -- Supporting Evidence
    evidence_sources JSONB,
    questionnaire_responses JSONB,
    documentation_reviewed JSONB,
    
    -- Expert Assessment
    maturity_level INTEGER CHECK (maturity_level >= 1 AND maturity_level <= 5),
    maturity_justification TEXT,
    control_effectiveness VARCHAR(50) CHECK (control_effectiveness IN ('effective', 'partially_effective', 'ineffective')),
    
    -- Review Status
    is_complete BOOLEAN DEFAULT FALSE,
    requires_follow_up BOOLEAN DEFAULT FALSE,
    follow_up_actions JSONB,
    
    -- Metadata
    analyst_id INTEGER NOT NULL REFERENCES users(id),
    analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique combination per risk score and domain
    UNIQUE(risk_score_id, domain_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_risk_scores_entity_id ON risk_scores(entity_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_score_type ON risk_scores(score_type);
CREATE INDEX IF NOT EXISTS idx_risk_scores_risk_level ON risk_scores(risk_level);
CREATE INDEX IF NOT EXISTS idx_risk_scores_scoring_date ON risk_scores(scoring_date DESC);
CREATE INDEX IF NOT EXISTS idx_risk_scores_status ON risk_scores(status);
CREATE INDEX IF NOT EXISTS idx_risk_scores_is_current ON risk_scores(is_current);
CREATE INDEX IF NOT EXISTS idx_risk_scores_created_by ON risk_scores(created_by);

CREATE INDEX IF NOT EXISTS idx_scoring_domains_domain_code ON scoring_domains(domain_code);
CREATE INDEX IF NOT EXISTS idx_scoring_domains_category ON scoring_domains(category);
CREATE INDEX IF NOT EXISTS idx_scoring_domains_is_active ON scoring_domains(is_active);

CREATE INDEX IF NOT EXISTS idx_scoring_domain_analyses_risk_score ON scoring_domain_analyses(risk_score_id);
CREATE INDEX IF NOT EXISTS idx_scoring_domain_analyses_domain ON scoring_domain_analyses(domain_id);
CREATE INDEX IF NOT EXISTS idx_scoring_domain_analyses_analyst ON scoring_domain_analyses(analyst_id);
CREATE INDEX IF NOT EXISTS idx_scoring_domain_analyses_complete ON scoring_domain_analyses(is_complete);

-- Add triggers for updated_at
CREATE TRIGGER update_risk_scores_updated_at 
    BEFORE UPDATE ON risk_scores 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scoring_domains_updated_at 
    BEFORE UPDATE ON scoring_domains 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scoring_domain_analyses_updated_at 
    BEFORE UPDATE ON scoring_domain_analyses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert standard scoring domains based on ACAPS requirements
INSERT INTO scoring_domains (
    domain_name, 
    domain_code, 
    description, 
    category, 
    default_weight,
    applicable_entity_types,
    scoring_criteria,
    maturity_scale,
    created_by
) VALUES 
(
    'Organisation LBC/FT',
    'ORG',
    'Évaluation de la structure organisationnelle et de la gouvernance LBC/FT',
    'lbc_ft_organization',
    1.0,
    '["insurance_company", "reinsurance_company", "insurance_intermediary"]'::jsonb,
    '{
        "governance": {"weight": 0.3, "criteria": ["board_oversight", "senior_management", "compliance_function"]},
        "policies": {"weight": 0.3, "criteria": ["written_policies", "procedures", "updates"]},
        "training": {"weight": 0.2, "criteria": ["staff_training", "awareness", "frequency"]},
        "resources": {"weight": 0.2, "criteria": ["staffing", "budget", "technology"]}
    }'::jsonb,
    '{
        "1": "Inexistant - Aucune organisation LBC/FT",
        "2": "Initial - Organisation basique en place",
        "3": "En développement - Organisation structurée avec lacunes",
        "4": "Géré - Organisation mature avec amélioration continue",
        "5": "Optimisé - Organisation exemplaire et innovante"
    }'::jsonb,
    1
),
(
    'Classification des Risques',
    'CLASS',
    'Évaluation de la capacité à identifier et classer les risques LBC/FT',
    'risk_classification',
    1.0,
    '["insurance_company", "reinsurance_company", "insurance_intermediary"]'::jsonb,
    '{
        "risk_assessment": {"weight": 0.4, "criteria": ["methodology", "frequency", "documentation"]},
        "customer_risk": {"weight": 0.3, "criteria": ["due_diligence", "risk_rating", "monitoring"]},
        "product_risk": {"weight": 0.3, "criteria": ["product_assessment", "controls", "approval"]}
    }'::jsonb,
    '{
        "1": "Inexistant - Aucune classification des risques",
        "2": "Initial - Classification basique",
        "3": "En développement - Classification systématique avec lacunes",
        "4": "Géré - Classification complète et régulièrement mise à jour",
        "5": "Optimisé - Classification sophistiquée et prédictive"
    }'::jsonb,
    1
),
(
    'Filtrage et Surveillance',
    'FILT',
    'Évaluation des systèmes de filtrage et de surveillance des transactions',
    'filtering_monitoring',
    1.0,
    '["insurance_company", "reinsurance_company", "insurance_intermediary"]'::jsonb,
    '{
        "transaction_monitoring": {"weight": 0.4, "criteria": ["automated_systems", "thresholds", "alerts"]},
        "sanctions_screening": {"weight": 0.3, "criteria": ["database_coverage", "frequency", "match_resolution"]},
        "reporting": {"weight": 0.3, "criteria": ["suspicious_activity", "timeliness", "quality"]}
    }'::jsonb,
    '{
        "1": "Inexistant - Aucun filtrage systématique",
        "2": "Initial - Filtrage manuel ou basique",
        "3": "En développement - Systèmes automatisés avec limitations",
        "4": "Géré - Systèmes sophistiqués et efficaces",
        "5": "Optimisé - Systèmes avancés avec intelligence artificielle"
    }'::jsonb,
    1
),
(
    'Connaissance Client (KYC)',
    'KYC',
    'Évaluation des procédures de connaissance et de diligence client',
    'customer_due_diligence',
    1.0,
    '["insurance_company", "reinsurance_company", "insurance_intermediary"]'::jsonb,
    '{
        "identification": {"weight": 0.3, "criteria": ["customer_identification", "beneficial_ownership", "documentation"]},
        "due_diligence": {"weight": 0.4, "criteria": ["enhanced_dd", "ongoing_monitoring", "risk_based"]},
        "record_keeping": {"weight": 0.3, "criteria": ["documentation", "retention", "accessibility"]}
    }'::jsonb,
    '{
        "1": "Inexistant - Aucune procédure KYC formelle",
        "2": "Initial - Procédures basiques d identification",
        "3": "En développement - KYC structuré avec lacunes",
        "4": "Géré - KYC complet et adapté aux risques",
        "5": "Optimisé - KYC avancé avec technologies innovantes"
    }'::jsonb,
    1
)
ON CONFLICT (domain_code) DO NOTHING;

-- Insert sample risk scores for the test entities
INSERT INTO risk_scores (
    entity_id,
    score_type,
    score_value,
    risk_level,
    scoring_period,
    domain_scores,
    calculation_method,
    status,
    analyst_comments,
    created_by
) VALUES 
(
    1, -- Wafa Assurance
    'inherent_risk',
    65.5,
    'medium',
    '2024-Q1',
    '{"organization": 70, "classification": 60, "filtering": 75, "kyc": 55}'::jsonb,
    'automatic',
    'approved',
    'Évaluation basée sur les réponses au questionnaire annuel LBC/FT 2024',
    1
),
(
    1, -- Wafa Assurance
    'risk_management_device',
    72.0,
    'medium',
    '2024-Q1',
    '{"organization": 75, "classification": 68, "filtering": 80, "kyc": 65}'::jsonb,
    'hybrid',
    'approved',
    'Dispositif de maîtrise des risques évalué lors de la mission sur place',
    1
),
(
    2, -- AtlantaSanad
    'inherent_risk',
    58.0,
    'medium',
    '2024-Q1',
    '{"organization": 55, "classification": 65, "filtering": 60, "kyc": 50}'::jsonb,
    'automatic',
    'pending_review',
    'Première évaluation - nécessite validation par expert',
    1
);

-- Calculate net risk scores (simplified calculation: weighted average)
-- This would normally be done by the application logic
UPDATE risk_scores 
SET score_value = 68.8, risk_level = 'medium'
WHERE entity_id = 1 AND score_type = 'inherent_risk';

-- Insert domain analyses for the first entity
INSERT INTO scoring_domain_analyses (
    risk_score_id,
    domain_id,
    domain_score,
    weight_applied,
    weighted_score,
    findings,
    strengths,
    weaknesses,
    maturity_level,
    control_effectiveness,
    is_complete,
    analyst_id
) VALUES 
(
    1, -- Risk score ID for Wafa inherent risk
    1, -- Organisation domain
    70.0,
    1.0,
    70.0,
    'Organisation LBC/FT bien structurée avec comité dédié et responsable compliance identifié.',
    'Gouvernance claire, politiques documentées, formation régulière du personnel.',
    'Manque de formation spécialisée pour certains métiers, budget LBC/FT à renforcer.',
    3,
    'partially_effective',
    true,
    1
),
(
    1, -- Risk score ID for Wafa inherent risk  
    2, -- Classification domain
    60.0,
    1.0,
    60.0,
    'Système de classification des risques en place mais nécessite des améliorations.',
    'Méthodologie documentée, mise à jour annuelle des évaluations.',
    'Classification des produits à renforcer, monitoring des clients à améliorer.',
    2,
    'partially_effective',
    true,
    1
);