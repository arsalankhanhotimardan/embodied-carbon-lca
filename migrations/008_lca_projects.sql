-- LCA V2.6 - project save/load
-- Safe additive migration. No existing LCA/CBAM calculation tables are altered.

CREATE TABLE IF NOT EXISTS lca_projects (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  edit_token_hash CHAR(64) NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  app_version VARCHAR(32) NOT NULL DEFAULT 'LCA-V2.6',
  calculation_engine_version VARCHAR(32) NOT NULL DEFAULT 'LCA-V2.5',

  study_period_years DOUBLE PRECISION NOT NULL DEFAULT 60,
  floor_area_m2 DOUBLE PRECISION NOT NULL DEFAULT 0,
  annual_energy_kwh DOUBLE PRECISION NOT NULL DEFAULT 0,
  grid_intensity DOUBLE PRECISION NOT NULL DEFAULT 0,

  baseline_rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  proposed_rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT lca_projects_name_length
    CHECK (char_length(name) BETWEEN 1 AND 160),
  CONSTRAINT lca_projects_baseline_rows_array
    CHECK (jsonb_typeof(baseline_rows) = 'array'),
  CONSTRAINT lca_projects_proposed_rows_array
    CHECK (jsonb_typeof(proposed_rows) = 'array'),
  CONSTRAINT lca_projects_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT lca_projects_nonnegative_settings
    CHECK (
      study_period_years >= 0
      AND floor_area_m2 >= 0
      AND annual_energy_kwh >= 0
      AND grid_intensity >= 0
    )
);

CREATE INDEX IF NOT EXISTS idx_lca_projects_updated_at
  ON lca_projects (updated_at DESC);

COMMENT ON TABLE lca_projects IS
  'LCA V2.6 project snapshots. Access is protected by a per-project edit token hash until account authentication is added.';
