-- Tabela de Prompts
CREATE TABLE IF NOT EXISTS prompts (
    id SERIAL PRIMARY KEY,
    tool_id VARCHAR(50) NOT NULL,
    prompt_type VARCHAR(50) NOT NULL,
    description TEXT,
    parameters JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Ferramentas
CREATE TABLE IF NOT EXISTS tools (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    tool_set JSONB,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Configurações de API
CREATE TABLE IF NOT EXISTS api_configurations (
    id SERIAL PRIMARY KEY,
    tool_id VARCHAR(50) NOT NULL,
    base_url TEXT NOT NULL,
    method VARCHAR(10) NOT NULL,
    authentication_type VARCHAR(50),
    auth_config JSONB,
    headers JSONB,
    additional_params JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);