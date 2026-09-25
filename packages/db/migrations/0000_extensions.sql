-- Extensions required by Doulisha (BUILD_PROMPT section 5).
CREATE EXTENSION IF NOT EXISTS postgis;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;
--> statement-breakpoint
-- unaccent() is only STABLE, so it cannot be used in an index expression.
-- This wrapper pins the dictionary and is declared IMMUTABLE, the usual
-- pattern for accent-insensitive trigram search ("Randonnée" matches "randonnee").
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE PARALLEL SAFE STRICT
AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;
