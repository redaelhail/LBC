-- Add supervised entities and related tables
-- 08-add-supervised-entities.sql

-- Create entity category enum
CREATE TYPE entity_category AS ENUM (
    'insurance_company', 
    'reinsurance_company', 
    'insurance_intermediary', 
    'broker', 
    'agent'
);

-- Create entity status enum  
CREATE TYPE entity_status AS ENUM (
    'active', 
    'inactive', 
    'suspended', 
    'under_investigation'
);

-- Create supervised entities table (Fiche signalétique)
CREATE TABLE IF NOT EXISTS supervised_entities (
    id SERIAL PRIMARY KEY,
    
    -- Basic Information
    denomination VARCHAR(255) NOT NULL,
    commercial_name VARCHAR(255),
    category entity_category NOT NULL,
    registration_number VARCHAR(100) UNIQUE,
    tax_id VARCHAR(50),
    
    -- Legal Information
    legal_form VARCHAR(100),
    incorporation_date TIMESTAMP,
    headquarters_address TEXT,
    postal_code VARCHAR(20),
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Morocco',
    
    -- Business Information
    authorized_capital DECIMAL(15,2),
    paid_capital DECIMAL(15,2),
    annual_turnover DECIMAL(15,2),
    number_of_employees INTEGER,
    
    -- Insurance Specific
    activities_authorized JSONB,
    license_number VARCHAR(100),
    license_date TIMESTAMP,
    
    -- Key Business Metrics
    total_premiums_written DECIMAL(15,2) DEFAULT 0.0,
    total_claims_paid DECIMAL(15,2) DEFAULT 0.0,
    technical_reserves DECIMAL(15,2) DEFAULT 0.0,
    solvency_ratio DECIMAL(5,2),
    
    -- Risk Indicators
    pep_exposure BOOLEAN DEFAULT FALSE,
    foreign_clients_ratio DECIMAL(5,4) DEFAULT 0.0,
    cash_transactions_volume DECIMAL(15,2) DEFAULT 0.0,
    high_risk_countries_exposure DECIMAL(5,4) DEFAULT 0.0,
    
    -- Regulatory Status
    status entity_status DEFAULT 'active',
    last_inspection_date TIMESTAMP,
    next_inspection_due TIMESTAMP,
    compliance_rating VARCHAR(20),
    
    -- LBC/FT Specific Information
    lbc_ft_policy_date TIMESTAMP,
    lbc_ft_training_date TIMESTAMP,
    suspicious_transactions_reported INTEGER DEFAULT 0,
    last_questionnaire_submission TIMESTAMP,
    
    -- Metadata
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Create entity directors table
CREATE TABLE IF NOT EXISTS entity_directors (
    id SERIAL PRIMARY KEY,
    
    -- Entity Relationship
    entity_id INTEGER NOT NULL REFERENCES supervised_entities(id) ON DELETE CASCADE,
    
    -- Personal Information
    full_name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    national_id VARCHAR(50),
    passport_number VARCHAR(50),
    nationality VARCHAR(100),
    date_of_birth TIMESTAMP,
    place_of_birth VARCHAR(200),
    
    -- Contact Information
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    
    -- Professional Information
    position_title VARCHAR(200) NOT NULL,
    department VARCHAR(100),
    is_effective_director BOOLEAN DEFAULT FALSE,
    appointment_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Qualification and Experience
    education_background TEXT,
    professional_experience TEXT,
    insurance_experience_years INTEGER,
    previous_positions TEXT,
    
    -- Compliance Information
    has_criminal_record BOOLEAN DEFAULT FALSE,
    is_pep BOOLEAN DEFAULT FALSE,
    sanctions_screening_status VARCHAR(50) DEFAULT 'pending',
    last_screening_date TIMESTAMP,
    
    -- Powers and Responsibilities
    signing_authority BOOLEAN DEFAULT FALSE,
    financial_authority_limit INTEGER,
    responsibilities TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Create entity LBC contacts table
CREATE TABLE IF NOT EXISTS entity_lbc_contacts (
    id SERIAL PRIMARY KEY,
    
    -- Entity Relationship
    entity_id INTEGER NOT NULL REFERENCES supervised_entities(id) ON DELETE CASCADE,
    
    -- Personal Information
    full_name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    national_id VARCHAR(50),
    
    -- Contact Information
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    mobile_phone VARCHAR(50),
    fax VARCHAR(50),
    office_address TEXT,
    
    -- Professional Information
    position_title VARCHAR(200) NOT NULL,
    department VARCHAR(100),
    direct_supervisor VARCHAR(200),
    appointment_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- LBC/FT Specific Information
    is_primary_contact BOOLEAN DEFAULT FALSE,
    is_compliance_officer BOOLEAN DEFAULT FALSE,
    lbc_ft_certification VARCHAR(200),
    certification_date TIMESTAMP,
    certification_expiry TIMESTAMP,
    
    -- Training and Qualifications
    lbc_ft_training_completed BOOLEAN DEFAULT FALSE,
    last_training_date TIMESTAMP,
    training_institution VARCHAR(200),
    continuing_education_hours INTEGER DEFAULT 0,
    
    -- Responsibilities and Authority
    responsibilities TEXT,
    reporting_authority BOOLEAN DEFAULT FALSE,
    investigation_authority BOOLEAN DEFAULT FALSE,
    training_responsibility BOOLEAN DEFAULT FALSE,
    
    -- Communication Preferences
    preferred_language VARCHAR(50) DEFAULT 'French',
    communication_method VARCHAR(50) DEFAULT 'email',
    receives_regulatory_updates BOOLEAN DEFAULT TRUE,
    
    -- Performance Metrics
    reports_submitted_count INTEGER DEFAULT 0,
    training_sessions_conducted INTEGER DEFAULT 0,
    last_report_date TIMESTAMP,
    response_time_avg_hours INTEGER,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_supervised_entities_denomination ON supervised_entities(denomination);
CREATE INDEX IF NOT EXISTS idx_supervised_entities_category ON supervised_entities(category);
CREATE INDEX IF NOT EXISTS idx_supervised_entities_status ON supervised_entities(status);
CREATE INDEX IF NOT EXISTS idx_supervised_entities_registration ON supervised_entities(registration_number);
CREATE INDEX IF NOT EXISTS idx_supervised_entities_created_by ON supervised_entities(created_by);

CREATE INDEX IF NOT EXISTS idx_entity_directors_entity_id ON entity_directors(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_directors_national_id ON entity_directors(national_id);
CREATE INDEX IF NOT EXISTS idx_entity_directors_is_effective ON entity_directors(is_effective_director);
CREATE INDEX IF NOT EXISTS idx_entity_directors_is_active ON entity_directors(is_active);

CREATE INDEX IF NOT EXISTS idx_entity_lbc_contacts_entity_id ON entity_lbc_contacts(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_lbc_contacts_email ON entity_lbc_contacts(email);
CREATE INDEX IF NOT EXISTS idx_entity_lbc_contacts_is_primary ON entity_lbc_contacts(is_primary_contact);
CREATE INDEX IF NOT EXISTS idx_entity_lbc_contacts_is_active ON entity_lbc_contacts(is_active);

-- Create trigger for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_supervised_entities_updated_at 
    BEFORE UPDATE ON supervised_entities 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entity_directors_updated_at 
    BEFORE UPDATE ON entity_directors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entity_lbc_contacts_updated_at 
    BEFORE UPDATE ON entity_lbc_contacts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO supervised_entities (
    denomination, 
    category, 
    registration_number, 
    tax_id,
    headquarters_address,
    city,
    authorized_capital,
    paid_capital,
    activities_authorized,
    license_number,
    status,
    created_by
) VALUES 
(
    'Wafa Assurance', 
    'insurance_company', 
    'RC-001-WAFA', 
    'IF123456789',
    '1 Place des Almoravides, Casablanca',
    'Casablanca',
    1000000000.00,
    1000000000.00,
    '["vie", "non-vie", "automobile", "sante"]'::jsonb,
    'LIC-WAFA-001',
    'active',
    1
),
(
    'AtlantaSanad Assurance', 
    'insurance_company', 
    'RC-002-ATLANTA', 
    'IF987654321',
    'Casablanca Finance City, Tour AtlantaSanad',
    'Casablanca', 
    500000000.00,
    500000000.00,
    '["non-vie", "automobile", "entreprise"]'::jsonb,
    'LIC-ATLANTA-002',
    'active',
    1
)
ON CONFLICT (registration_number) DO NOTHING;

-- Insert sample directors
INSERT INTO entity_directors (
    entity_id,
    full_name,
    first_name,
    last_name,
    position_title,
    is_effective_director,
    appointment_date,
    is_active
) VALUES 
(
    1,
    'Mohammed Ben Ali',
    'Mohammed',
    'Ben Ali', 
    'Directeur Général',
    TRUE,
    '2020-01-15'::timestamp,
    TRUE
),
(
    2,
    'Fatima Zahra Bennani',
    'Fatima Zahra',
    'Bennani',
    'Directrice Générale',
    TRUE,
    '2019-03-01'::timestamp,
    TRUE
);

-- Insert sample LBC contacts
INSERT INTO entity_lbc_contacts (
    entity_id,
    full_name,
    first_name,
    last_name,
    email,
    phone,
    position_title,
    is_primary_contact,
    is_compliance_officer,
    appointment_date,
    lbc_ft_training_completed,
    is_active
) VALUES 
(
    1,
    'Ahmed Alami',
    'Ahmed',
    'Alami',
    'a.alami@wafaassurance.ma',
    '+212522123456',
    'Responsable Conformité LBC/FT',
    TRUE,
    TRUE,
    '2020-02-01'::timestamp,
    TRUE,
    TRUE
),
(
    2,
    'Nadia Tazi',
    'Nadia',
    'Tazi',
    'n.tazi@atlantasanad.ma', 
    '+212522654321',
    'Chargée de Conformité',
    TRUE,
    TRUE,
    '2019-04-15'::timestamp,
    TRUE,
    TRUE
);