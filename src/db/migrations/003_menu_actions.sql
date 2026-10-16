-- Actions a screen supports. The Roles & Permissions matrix only offers these, and the API
-- ignores the others. "approve" is only for screens with an approval step (tasks, planner,
-- timesheets, reviews…), so the current screens leave it out.

ALTER TABLE menus
    ADD COLUMN actions text[] NOT NULL DEFAULT '{view,create,edit,delete,export}',
    ADD CONSTRAINT ck_menus__actions CHECK (actions <@ '{view,create,edit,delete,approve,export}'::text[]);

COMMENT ON COLUMN menus.actions IS 'actions this screen supports (subset of view, create, edit, delete, approve, export)';

-- drop permissions that were granted for actions the screen does not support
UPDATE role_permissions rp
   SET can_approve = can_approve AND 'approve' = ANY (m.actions),
       can_create  = can_create  AND 'create'  = ANY (m.actions),
       can_edit    = can_edit    AND 'edit'    = ANY (m.actions),
       can_delete  = can_delete  AND 'delete'  = ANY (m.actions),
       can_export  = can_export  AND 'export'  = ANY (m.actions)
  FROM menus m
 WHERE m.id = rp.menu_id;
