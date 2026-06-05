-- Athletyx MCP user profile table (local / dev)
-- Apply against the database referenced by DB_* environment variables.

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    fitness_goal VARCHAR(100) NOT NULL,
    experience_level VARCHAR(50) NOT NULL,
    CONSTRAINT users_email_not_empty CHECK (trim(email) <> ''),
    CONSTRAINT users_name_not_empty CHECK (trim(name) <> '')
);

CREATE INDEX IF NOT EXISTS idx_users_fitness_goal ON users (fitness_goal);
CREATE INDEX IF NOT EXISTS idx_users_experience_level ON users (experience_level);

INSERT INTO users (name, email, fitness_goal, experience_level)
VALUES
    ('Alex Rivera', 'alex@athletyx.test', 'muscle_gain', 'intermediate'),
    ('Jordan Lee', 'jordan@athletyx.test', 'fat_loss', 'beginner'),
    ('Sam Patel', 'sam@athletyx.test', 'endurance', 'advanced')
ON CONFLICT (email) DO NOTHING;
