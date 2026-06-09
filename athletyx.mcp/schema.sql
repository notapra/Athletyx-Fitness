-- Athletyx MCP schema (Phase 1 - app-store grade)
-- Idempotent: safe to re-run via setup_db.py / bootstrap.py

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    fitness_goal VARCHAR(100) NOT NULL,
    experience_level VARCHAR(50) NOT NULL,
    CONSTRAINT users_email_not_empty CHECK (trim(email) <> ''),
    CONSTRAINT users_name_not_empty CHECK (trim(name) <> '')
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS units VARCHAR(10) DEFAULT 'lbs';
ALTER TABLE users ADD COLUMN IF NOT EXISTS bodyweight NUMERIC;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS constraints JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS personal_factors JSONB DEFAULT '{
  "max_effort_level": "moderate",
  "injury_history": [],
  "movement_restrictions": [],
  "recovery_capacity": "average",
  "medical_clearance": true,
  "notes": ""
}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE TABLE IF NOT EXISTS goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    target TEXT,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goals_user ON goals (user_id);

CREATE TABLE IF NOT EXISTS workout_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    split VARCHAR(50) NOT NULL DEFAULT 'Upper',
    duration INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    started_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user ON workout_sessions (user_id);

CREATE TABLE IF NOT EXISTS exercise_entries (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_name VARCHAR(255) NOT NULL,
    muscle_group VARCHAR(100),
    sort_order INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_exercise_entries_session ON exercise_entries (session_id);

CREATE TABLE IF NOT EXISTS sets (
    id SERIAL PRIMARY KEY,
    exercise_entry_id INTEGER NOT NULL REFERENCES exercise_entries(id) ON DELETE CASCADE,
    reps INTEGER NOT NULL DEFAULT 0,
    weight NUMERIC NOT NULL DEFAULT 0,
    sort_order INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sets_exercise ON sets (exercise_entry_id);

CREATE TABLE IF NOT EXISTS bodyweight_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    weight NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bodyweight_user ON bodyweight_logs (user_id);

CREATE TABLE IF NOT EXISTS user_consents (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    ai_coaching BOOLEAN DEFAULT false,
    analytics BOOLEAN DEFAULT false,
    notifications BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_fitness_goal ON users (fitness_goal);
CREATE INDEX IF NOT EXISTS idx_users_experience_level ON users (experience_level);

INSERT INTO users (name, email, fitness_goal, experience_level, units, bodyweight, age, personal_factors)
VALUES
    (
        'Alex Rivera', 'alex@athletyx.test', 'muscle_gain', 'intermediate', 'lbs', 180, 28,
        '{"max_effort_level": "aggressive", "injury_history": [], "movement_restrictions": [], "recovery_capacity": "fast", "medical_clearance": true, "notes": ""}'::jsonb
    ),
    (
        'Jordan Lee', 'jordan@athletyx.test', 'fat_loss', 'beginner', 'lbs', 165, 34,
        '{"max_effort_level": "conservative", "injury_history": ["lower back strain 2024"], "movement_restrictions": ["heavy deadlifts from floor"], "recovery_capacity": "slow", "medical_clearance": true, "notes": "Prefer machines and goblet squats over barbell back squat."}'::jsonb
    ),
    (
        'Sam Patel', 'sam@athletyx.test', 'endurance', 'advanced', 'kg', 78, 41,
        '{"max_effort_level": "moderate", "injury_history": ["right knee ACL repair 2021"], "movement_restrictions": ["deep knee flexion past 90 degrees", "pistol squats"], "recovery_capacity": "average", "medical_clearance": true, "notes": "Can push hard on upper body; keep leg intensity RPE 7 max."}'::jsonb
    )
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_consents (user_id, ai_coaching, analytics, notifications)
SELECT id, true, true, true FROM users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO goals (user_id, title, target)
SELECT u.id, g.title, g.target
FROM users u
JOIN (VALUES
    ('alex@athletyx.test', 'Bench 225', 'by December'),
    ('jordan@athletyx.test', 'Lose 10 lbs', 'by summer')
) AS g(email, title, target) ON u.email = g.email
WHERE NOT EXISTS (
    SELECT 1 FROM goals x WHERE x.user_id = u.id AND x.title = g.title
);
