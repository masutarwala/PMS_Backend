-- Project stages replace the fixed project status on screen.
-- Stages are admin-editable lookups (type PROJECT_STAGE). lookups.value holds what the stage
-- "counts as" – not_started / in_progress / on_hold / completed / cancelled – and projects.status
-- keeps that category so summaries, overdue checks and tabs keep working.

INSERT INTO lookups (type, name, value, display_order) VALUES
    ('PROJECT_STAGE', 'Draft',            'not_started',  1),
    ('PROJECT_STAGE', 'Analysis',         'in_progress',  2),
    ('PROJECT_STAGE', 'Design',           'in_progress',  3),
    ('PROJECT_STAGE', 'Development',      'in_progress',  4),
    ('PROJECT_STAGE', 'QA',               'in_progress',  5),
    ('PROJECT_STAGE', 'UAT',              'in_progress',  6),
    ('PROJECT_STAGE', 'Awaiting release', 'in_progress',  7),
    ('PROJECT_STAGE', 'Released',         'completed',    8),
    ('PROJECT_STAGE', 'Live',             'completed',    9),
    ('PROJECT_STAGE', 'AMC',              'in_progress', 10),
    ('PROJECT_STAGE', 'On Hold',          'on_hold',     11),
    ('PROJECT_STAGE', 'Closed',           'completed',   12),
    ('PROJECT_STAGE', 'Cancelled',        'cancelled',   13)
ON CONFLICT (type, name) DO NOTHING;

ALTER TABLE projects ADD COLUMN stage_id bigint;
ALTER TABLE projects ADD CONSTRAINT fk_projects__stage_id FOREIGN KEY (stage_id) REFERENCES lookups (id) ON DELETE RESTRICT;
CREATE INDEX ix_projects__stage_id ON projects (stage_id);
COMMENT ON COLUMN projects.stage_id IS 'current stage (lookups type PROJECT_STAGE); status = the stage''s category';

-- existing projects: pick the stage that matches their status
UPDATE projects p
   SET stage_id = l.id, stage = l.name
  FROM lookups l
 WHERE l.type = 'PROJECT_STAGE'
   AND l.name = CASE p.status
                  WHEN 'not_started' THEN 'Draft'
                  WHEN 'in_progress' THEN 'Development'
                  WHEN 'on_hold'     THEN 'On Hold'
                  WHEN 'completed'   THEN 'Closed'
                  WHEN 'cancelled'   THEN 'Cancelled'
                END;
