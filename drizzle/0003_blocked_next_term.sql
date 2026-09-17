ALTER TABLE "planning_preferences" ADD COLUMN "blocked_next_term_codes" jsonb DEFAULT '[]'::jsonb NOT NULL;
