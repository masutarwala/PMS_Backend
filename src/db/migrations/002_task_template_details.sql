-- Task template details (from the task-template sheet: Approvals, TaskDescription, AssignedRoles).
--   description        – copied into tasks.description when a project of this type is created
--   effort_percentage  – share of the project effort for this task; per task group they add up to the
--                        default effort split, and the task's estimate = project hours × this %
--   manager_approval   – the task needs approval by the manager ("Mgr" in the sheet)
--   client_approval    – the task needs approval by the client ("Client")
--   assigned roles     – job roles that work on the task; values are lookups of type TASK_ROLE

ALTER TABLE project_type_task_templates
    ADD COLUMN description text,
    ADD COLUMN manager_approval boolean NOT NULL DEFAULT false,
    ADD COLUMN client_approval boolean NOT NULL DEFAULT false,
    ADD COLUMN effort_percentage numeric(5,2),
    ADD CONSTRAINT ck_project_type_task_templates__effort CHECK (effort_percentage IS NULL OR (effort_percentage >= 0 AND effort_percentage <= 100));

COMMENT ON COLUMN project_type_task_templates.description IS 'copied into tasks.description for new projects';
COMMENT ON COLUMN project_type_task_templates.manager_approval IS 'task needs manager approval';
COMMENT ON COLUMN project_type_task_templates.client_approval IS 'task needs client approval';
COMMENT ON COLUMN project_type_task_templates.effort_percentage IS '% of project effort; summed per task group = default effort split';

CREATE TABLE project_type_task_template_roles (
    task_template_id bigint NOT NULL,
    role_id bigint NOT NULL,
    CONSTRAINT pk_project_type_task_template_roles PRIMARY KEY (task_template_id, role_id),
    CONSTRAINT fk_project_type_task_template_roles__task_template_id FOREIGN KEY (task_template_id)
        REFERENCES project_type_task_templates (id) ON DELETE CASCADE,
    CONSTRAINT fk_project_type_task_template_roles__role_id FOREIGN KEY (role_id)
        REFERENCES lookups (id) ON DELETE RESTRICT
);
CREATE INDEX ix_project_type_task_template_roles__role_id ON project_type_task_template_roles (role_id);

COMMENT ON TABLE project_type_task_template_roles IS 'Job roles assigned to a task template (lookups type TASK_ROLE)';
