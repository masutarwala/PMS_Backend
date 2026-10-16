-- PMS rebuild – PostgreSQL schema
-- Generated from Screens/_tools/pg_schema.py by generate_ddl.py – do not edit by hand.
-- Run on an empty database (all statements run in one transaction).

-- (transaction handled by the migration runner)

-- updated_at is maintained by this trigger on every table with audit columns
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

CREATE TABLE roles (
    id bigint GENERATED ALWAYS AS IDENTITY,
    code varchar(50) NOT NULL,
    name varchar(100) NOT NULL,
    level smallint NOT NULL,
    role_type varchar(20) NOT NULL DEFAULT 'internal',
    data_scope varchar(20) NOT NULL DEFAULT 'own',
    is_system boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_roles PRIMARY KEY (id)
);
CREATE TABLE menus (
    id bigint GENERATED ALWAYS AS IDENTITY,
    name varchar(100) NOT NULL,
    parent_id bigint,
    url varchar(200),
    icon varchar(50),
    display_order int NOT NULL DEFAULT 0,
    is_visible boolean NOT NULL DEFAULT true,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_menus PRIMARY KEY (id)
);
CREATE TABLE role_permissions (
    id bigint GENERATED ALWAYS AS IDENTITY,
    role_id bigint NOT NULL,
    menu_id bigint NOT NULL,
    can_view boolean NOT NULL DEFAULT false,
    can_create boolean NOT NULL DEFAULT false,
    can_edit boolean NOT NULL DEFAULT false,
    can_delete boolean NOT NULL DEFAULT false,
    can_approve boolean NOT NULL DEFAULT false,
    can_export boolean NOT NULL DEFAULT false,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_role_permissions PRIMARY KEY (id)
);
CREATE TABLE users (
    id bigint GENERATED ALWAYS AS IDENTITY,
    emp_code varchar(30),
    username varchar(100) NOT NULL,
    password_hash varchar(255) NOT NULL,
    name varchar(150) NOT NULL,
    email varchar(150),
    role_id bigint NOT NULL,
    user_type_id bigint,
    shift_id bigint,
    site_id bigint,
    time_zone varchar(50) NOT NULL DEFAULT 'Asia/Kolkata',
    resource_grade_id bigint,
    vendor_id bigint,
    customer_id bigint,
    reports_to bigint,
    reviewed_by bigint,
    dob date,
    hourly_rate numeric(12,2),
    hourly_rate_currency char(3),
    is_active boolean NOT NULL DEFAULT true,
    is_on_leave boolean NOT NULL DEFAULT false,
    last_login_at timestamptz,
    failed_login_attempts smallint NOT NULL DEFAULT 0,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_users PRIMARY KEY (id)
);
CREATE TABLE user_teams (
    user_id bigint NOT NULL,
    team_id bigint NOT NULL,
    position varchar(50),
    CONSTRAINT pk_user_teams PRIMARY KEY (user_id, team_id)
);
CREATE TABLE refresh_tokens (
    id bigint GENERATED ALWAYS AS IDENTITY,
    user_id bigint NOT NULL,
    token_hash varchar(255) NOT NULL,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_refresh_tokens PRIMARY KEY (id)
);
CREATE TABLE lookups (
    id bigint GENERATED ALWAYS AS IDENTITY,
    type varchar(50) NOT NULL,
    name varchar(150) NOT NULL,
    value varchar(150),
    display_order int NOT NULL DEFAULT 0,
    is_visible boolean NOT NULL DEFAULT true,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_lookups PRIMARY KEY (id)
);
CREATE TABLE teams (
    id bigint GENERATED ALWAYS AS IDENTITY,
    name varchar(100) NOT NULL,
    country_id bigint,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_teams PRIMARY KEY (id)
);
CREATE TABLE sites (
    id bigint GENERATED ALWAYS AS IDENTITY,
    name varchar(100) NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_sites PRIMARY KEY (id)
);
CREATE TABLE shifts (
    id bigint GENERATED ALWAYS AS IDENTITY,
    name varchar(100) NOT NULL,
    start_time time NOT NULL,
    end_time time NOT NULL,
    late_after_minutes smallint,
    half_day_minutes smallint,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_shifts PRIMARY KEY (id)
);
CREATE TABLE states (
    id bigint GENERATED ALWAYS AS IDENTITY,
    name varchar(100) NOT NULL,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_states PRIMARY KEY (id)
);
CREATE TABLE cities (
    id bigint GENERATED ALWAYS AS IDENTITY,
    name varchar(100) NOT NULL,
    state_id bigint NOT NULL,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_cities PRIMARY KEY (id)
);
CREATE TABLE resource_grades (
    id bigint GENERATED ALWAYS AS IDENTITY,
    grade_id bigint NOT NULL,
    team_id bigint,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_resource_grades PRIMARY KEY (id)
);
CREATE TABLE resource_grade_costs (
    id bigint GENERATED ALWAYS AS IDENTITY,
    resource_grade_id bigint NOT NULL,
    cost_per_hour numeric(12,2) NOT NULL,
    currency char(3) NOT NULL,
    from_date date NOT NULL,
    to_date date,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_resource_grade_costs PRIMARY KEY (id)
);
CREATE TABLE task_groups (
    id bigint GENERATED ALWAYS AS IDENTITY,
    name varchar(100) NOT NULL,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_task_groups PRIMARY KEY (id)
);
CREATE TABLE task_types (
    id bigint GENERATED ALWAYS AS IDENTITY,
    name varchar(100) NOT NULL,
    description text,
    procedure_text text,
    completion_certificate varchar(500),
    task_group_id bigint NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_task_types PRIMARY KEY (id)
);
CREATE TABLE weekly_offs (
    id bigint GENERATED ALWAYS AS IDENTITY,
    code varchar(30) NOT NULL,
    description varchar(200),
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_weekly_offs PRIMARY KEY (id)
);
CREATE TABLE weekly_off_rules (
    id bigint GENERATED ALWAYS AS IDENTITY,
    weekly_off_id bigint NOT NULL,
    week_day varchar(10) NOT NULL,
    off_weeks varchar(20) NOT NULL,
    CONSTRAINT pk_weekly_off_rules PRIMARY KEY (id)
);
CREATE TABLE weekly_off_assignments (
    id bigint GENERATED ALWAYS AS IDENTITY,
    weekly_off_id bigint NOT NULL,
    year smallint NOT NULL,
    site_id bigint NOT NULL,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_weekly_off_assignments PRIMARY KEY (id)
);
CREATE TABLE holidays (
    id bigint GENERATED ALWAYS AS IDENTITY,
    holiday_date date NOT NULL,
    name varchar(150) NOT NULL,
    country_id bigint,
    site_id bigint,
    weekly_off_id bigint,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_holidays PRIMARY KEY (id)
);
CREATE TABLE currency_rates (
    id bigint GENERATED ALWAYS AS IDENTITY,
    base_currency char(3) NOT NULL,
    target_currency char(3) NOT NULL,
    rate numeric(18,6) NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_currency_rates PRIMARY KEY (id)
);
CREATE TABLE customers (
    id bigint GENERATED ALWAYS AS IDENTITY,
    code varchar(30) NOT NULL,
    name varchar(200) NOT NULL,
    country_id bigint,
    contact_person varchar(150),
    contact_number varchar(30),
    email varchar(150),
    is_active boolean NOT NULL DEFAULT true,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_customers PRIMARY KEY (id)
);
CREATE TABLE customer_locations (
    id bigint GENERATED ALWAYS AS IDENTITY,
    customer_id bigint NOT NULL,
    code varchar(30),
    name varchar(200) NOT NULL,
    contact_person varchar(150),
    designation varchar(100),
    contact_number varchar(30),
    email varchar(150),
    address text,
    city_id bigint,
    state_id bigint,
    pin_code varchar(10),
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_customer_locations PRIMARY KEY (id)
);
CREATE TABLE vendors (
    id bigint GENERATED ALWAYS AS IDENTITY,
    company_name varchar(200) NOT NULL,
    contact_person varchar(150),
    designation varchar(100),
    email varchar(150),
    alternate_email varchar(150),
    phone varchar(30),
    mobile varchar(30),
    address text,
    city_id bigint,
    state_id bigint,
    country_id bigint,
    pin_code varchar(10),
    category_id bigint,
    organisation_status_id bigint,
    join_date date,
    currency char(3),
    payment_mode_id bigint,
    payment_credit varchar(50),
    pan_no varchar(20),
    gst_no varchar(20),
    vat_no varchar(20),
    cst_no varchar(20),
    service_tax_no varchar(20),
    bank_account_name varchar(150),
    bank_name varchar(150),
    bank_account_number varchar(50),
    ifsc_code varchar(20),
    swift_code varchar(20),
    pan_card_url varchar(500),
    service_tax_certificate_url varchar(500),
    is_active boolean NOT NULL DEFAULT true,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_vendors PRIMARY KEY (id)
);
CREATE TABLE project_divisions (
    id bigint GENERATED ALWAYS AS IDENTITY,
    name varchar(100) NOT NULL,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_project_divisions PRIMARY KEY (id)
);
CREATE TABLE project_types (
    id bigint GENERATED ALWAYS AS IDENTITY,
    name varchar(100) NOT NULL,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_project_types PRIMARY KEY (id)
);
CREATE TABLE project_type_default_estimates (
    id bigint GENERATED ALWAYS AS IDENTITY,
    project_type_id bigint NOT NULL,
    task_group_id bigint NOT NULL,
    effort_percentage numeric(5,2) NOT NULL,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_project_type_default_estimates PRIMARY KEY (id)
);
CREATE TABLE project_type_task_templates (
    id bigint GENERATED ALWAYS AS IDENTITY,
    project_type_id bigint NOT NULL,
    task_group_id bigint NOT NULL,
    task_type_id bigint NOT NULL,
    task_title varchar(300) NOT NULL,
    sort_order int NOT NULL DEFAULT 0,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_project_type_task_templates PRIMARY KEY (id)
);
CREATE TABLE projects (
    id bigint GENERATED ALWAYS AS IDENTITY,
    code varchar(30) NOT NULL,
    title varchar(200) NOT NULL,
    project_division_id bigint NOT NULL,
    project_type_id bigint NOT NULL,
    is_retainer_project boolean NOT NULL DEFAULT false,
    customer_id bigint,
    owner_id bigint NOT NULL,
    estimated_hours numeric(10,2),
    estimated_amount numeric(14,2),
    estimated_amount_currency char(3),
    detail text,
    status varchar(30) NOT NULL,
    status_comments text,
    stage varchar(30),
    stage_date date,
    start_date date NOT NULL,
    end_date date,
    sharepoint_link varchar(500),
    is_synced boolean NOT NULL DEFAULT false,
    transfer_to_sales_pro boolean NOT NULL DEFAULT false,
    allocation_locked_at timestamptz,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_projects PRIMARY KEY (id)
);
CREATE TABLE project_commercials (
    id bigint GENERATED ALWAYS AS IDENTITY,
    project_id bigint NOT NULL,
    year smallint NOT NULL,
    project_value numeric(14,2) NOT NULL,
    project_value_currency char(3) NOT NULL,
    transfer_price numeric(14,2),
    transfer_price_currency char(3),
    balance_amount numeric(14,2),
    bill_by_hours boolean NOT NULL DEFAULT false,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_project_commercials PRIMARY KEY (id)
);
CREATE TABLE project_task_group_estimates (
    id bigint GENERATED ALWAYS AS IDENTITY,
    project_id bigint NOT NULL,
    task_group_id bigint NOT NULL,
    effort_percentage numeric(5,2) NOT NULL,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_project_task_group_estimates PRIMARY KEY (id)
);
CREATE TABLE project_members (
    id bigint GENERATED ALWAYS AS IDENTITY,
    project_id bigint NOT NULL,
    user_id bigint NOT NULL,
    access_level varchar(20) NOT NULL DEFAULT 'view',
    cost_per_hour numeric(12,2),
    currency char(3),
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_project_members PRIMARY KEY (id)
);
CREATE TABLE project_reviews (
    id bigint GENERATED ALWAYS AS IDENTITY,
    project_id bigint NOT NULL,
    stage varchar(30),
    review_date date NOT NULL DEFAULT current_date,
    comment text NOT NULL,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_project_reviews PRIMARY KEY (id)
);
CREATE TABLE project_review_task_groups (
    id bigint GENERATED ALWAYS AS IDENTITY,
    project_review_id bigint NOT NULL,
    task_group_id bigint NOT NULL,
    completion_percentage numeric(5,2) NOT NULL DEFAULT 0,
    CONSTRAINT pk_project_review_task_groups PRIMARY KEY (id)
);
CREATE TABLE tasks (
    id bigint GENERATED ALWAYS AS IDENTITY,
    kind varchar(10) NOT NULL DEFAULT 'project',
    customer_id bigint,
    project_id bigint,
    parent_task_id bigint,
    level smallint NOT NULL DEFAULT 0,
    predecessor_task_id bigint,
    task_group_id bigint,
    task_type_id bigint,
    name varchar(300) NOT NULL,
    description text,
    scope_of_work text,
    assigned_to bigint,
    owner_id bigint,
    priority varchar(20),
    status varchar(30) NOT NULL,
    is_private boolean NOT NULL DEFAULT false,
    display_order int NOT NULL DEFAULT 0,
    estimated_minutes int,
    actual_minutes int,
    planned_start timestamptz,
    planned_end timestamptz,
    actual_start timestamptz,
    actual_end timestamptz,
    remind_on_start boolean NOT NULL DEFAULT false,
    remind_on_end boolean NOT NULL DEFAULT false,
    reopen_count smallint NOT NULL DEFAULT 0,
    completion_comment text,
    last_comment text,
    email_on_change boolean NOT NULL DEFAULT false,
    completion_certificate_required boolean NOT NULL DEFAULT false,
    client_contact varchar(150),
    is_active boolean NOT NULL DEFAULT true,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_tasks PRIMARY KEY (id)
);
CREATE TABLE task_watchers (
    id bigint GENERATED ALWAYS AS IDENTITY,
    task_id bigint NOT NULL,
    user_id bigint NOT NULL,
    role varchar(30) NOT NULL,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_task_watchers PRIMARY KEY (id)
);
CREATE TABLE task_teams (
    task_id bigint NOT NULL,
    team_id bigint NOT NULL,
    CONSTRAINT pk_task_teams PRIMARY KEY (task_id, team_id)
);
CREATE TABLE task_checklist_items (
    id bigint GENERATED ALWAYS AS IDENTITY,
    task_id bigint NOT NULL,
    name varchar(300) NOT NULL,
    status varchar(30) NOT NULL DEFAULT 'pending',
    sort_order int NOT NULL DEFAULT 0,
    completed_by bigint,
    completed_at timestamptz,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_task_checklist_items PRIMARY KEY (id)
);
CREATE TABLE weekly_plans (
    id bigint GENERATED ALWAYS AS IDENTITY,
    user_id bigint NOT NULL,
    week_start date NOT NULL,
    working_days smallint NOT NULL DEFAULT 5,
    capacity_minutes int,
    status varchar(20) NOT NULL DEFAULT 'draft',
    submitted_at timestamptz,
    reviewed_by bigint,
    reviewed_at timestamptz,
    review_comment text,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_weekly_plans PRIMARY KEY (id)
);
CREATE TABLE weekly_plan_entries (
    id bigint GENERATED ALWAYS AS IDENTITY,
    weekly_plan_id bigint NOT NULL,
    project_id bigint NOT NULL,
    task_type_id bigint NOT NULL,
    estimated_minutes int NOT NULL,
    comment text,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_weekly_plan_entries PRIMARY KEY (id)
);
CREATE TABLE daily_plans (
    id bigint GENERATED ALWAYS AS IDENTITY,
    user_id bigint NOT NULL,
    plan_date date NOT NULL,
    weekly_plan_id bigint,
    status varchar(20) NOT NULL DEFAULT 'draft',
    day_note text,
    submitted_at timestamptz,
    reviewed_by bigint,
    reviewed_at timestamptz,
    review_comment text,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_daily_plans PRIMARY KEY (id)
);
CREATE TABLE daily_plan_items (
    id bigint GENERATED ALWAYS AS IDENTITY,
    daily_plan_id bigint NOT NULL,
    task_id bigint,
    title varchar(300),
    project_id bigint NOT NULL,
    task_type_id bigint NOT NULL,
    weekly_plan_entry_id bigint,
    planned_minutes int NOT NULL,
    sort_order int NOT NULL DEFAULT 0,
    status varchar(20) NOT NULL DEFAULT 'planned',
    carried_from date,
    note text,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_daily_plan_items PRIMARY KEY (id)
);
CREATE TABLE timesheets (
    id bigint GENERATED ALWAYS AS IDENTITY,
    user_id bigint NOT NULL,
    work_date date NOT NULL,
    project_id bigint NOT NULL,
    task_type_id bigint NOT NULL,
    task_id bigint,
    daily_plan_item_id bigint,
    minutes int NOT NULL,
    comment text,
    is_billable boolean NOT NULL DEFAULT true,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_timesheets PRIMARY KEY (id)
);
CREATE TABLE attendance (
    id bigint GENERATED ALWAYS AS IDENTITY,
    user_id bigint NOT NULL,
    attendance_date date NOT NULL,
    shift_id bigint,
    status varchar(20),
    is_present boolean,
    check_in_at timestamptz,
    check_in_ip inet,
    check_in_lat numeric(9,6),
    check_in_lng numeric(9,6),
    check_in_address text,
    check_out_at timestamptz,
    check_out_ip inet,
    check_out_lat numeric(9,6),
    check_out_lng numeric(9,6),
    check_out_address text,
    marked_by bigint,
    marked_at timestamptz,
    approval_status varchar(20),
    approved_by bigint,
    approved_at timestamptz,
    is_processed boolean NOT NULL DEFAULT false,
    remarks text,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_attendance PRIMARY KEY (id)
);
CREATE TABLE rosters (
    id bigint GENERATED ALWAYS AS IDENTITY,
    user_id bigint NOT NULL,
    roster_date date NOT NULL,
    shift_id bigint NOT NULL,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_rosters PRIMARY KEY (id)
);
CREATE TABLE biometric_logs (
    id bigint GENERATED ALWAYS AS IDENTITY,
    employee_name varchar(150),
    user_id bigint,
    log_at timestamptz NOT NULL,
    upload_id bigint,
    legacy_id bigint,
    CONSTRAINT pk_biometric_logs PRIMARY KEY (id)
);
CREATE TABLE mood_logs (
    id bigint GENERATED ALWAYS AS IDENTITY,
    user_id bigint NOT NULL,
    mood varchar(20) NOT NULL,
    mood_date date NOT NULL,
    legacy_id bigint,
    CONSTRAINT pk_mood_logs PRIMARY KEY (id)
);
CREATE TABLE review_periods (
    id bigint GENERATED ALWAYS AS IDENTITY,
    name varchar(100) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_review_periods PRIMARY KEY (id)
);
CREATE TABLE review_templates (
    id bigint GENERATED ALWAYS AS IDENTITY,
    title varchar(200) NOT NULL,
    review_period_id bigint,
    objective text,
    is_private boolean NOT NULL DEFAULT false,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_review_templates PRIMARY KEY (id)
);
CREATE TABLE review_template_kras (
    id bigint GENERATED ALWAYS AS IDENTITY,
    review_template_id bigint NOT NULL,
    description text NOT NULL,
    metric text,
    weightage smallint NOT NULL,
    sort_order int NOT NULL DEFAULT 0,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_review_template_kras PRIMARY KEY (id)
);
CREATE TABLE review_template_kpis (
    id bigint GENERATED ALWAYS AS IDENTITY,
    review_template_kra_id bigint NOT NULL,
    description text NOT NULL,
    metric text,
    weightage smallint NOT NULL,
    sort_order int NOT NULL DEFAULT 0,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_review_template_kpis PRIMARY KEY (id)
);
CREATE TABLE employee_reviews (
    id bigint GENERATED ALWAYS AS IDENTITY,
    employee_id bigint NOT NULL,
    reviewer_id bigint,
    hr_id bigint,
    review_period_id bigint NOT NULL,
    review_template_id bigint,
    title varchar(200),
    stage varchar(30) NOT NULL,
    is_locked boolean NOT NULL DEFAULT false,
    score numeric(5,2),
    objective_comment text,
    employee_comment text,
    manager_comment text,
    hr_comment text,
    employee_submitted_at timestamptz,
    reviewer_submitted_at timestamptz,
    hr_submitted_at timestamptz,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_employee_reviews PRIMARY KEY (id)
);
CREATE TABLE employee_review_kras (
    id bigint GENERATED ALWAYS AS IDENTITY,
    employee_review_id bigint NOT NULL,
    description text NOT NULL,
    metric text,
    weightage smallint NOT NULL,
    employee_rating numeric(4,2),
    employee_comment text,
    manager_rating numeric(4,2),
    manager_comment text,
    sort_order int NOT NULL DEFAULT 0,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_employee_review_kras PRIMARY KEY (id)
);
CREATE TABLE employee_review_kpis (
    id bigint GENERATED ALWAYS AS IDENTITY,
    employee_review_kra_id bigint NOT NULL,
    description text NOT NULL,
    metric text,
    weightage smallint NOT NULL,
    employee_rating numeric(4,2),
    employee_comment text,
    manager_rating numeric(4,2),
    manager_comment text,
    sort_order int NOT NULL DEFAULT 0,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_employee_review_kpis PRIMARY KEY (id)
);
CREATE TABLE ratings (
    id bigint GENERATED ALWAYS AS IDENTITY,
    user_id bigint NOT NULL,
    reviewed_by bigint,
    rating_month date NOT NULL,
    rating smallint NOT NULL,
    comment text,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_ratings PRIMARY KEY (id)
);
CREATE TABLE points (
    id bigint GENERATED ALWAYS AS IDENTITY,
    user_id bigint NOT NULL,
    reviewer_id bigint,
    point_date date NOT NULL,
    point_type varchar(30) NOT NULL,
    points smallint NOT NULL,
    comment text,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_points PRIMARY KEY (id)
);
CREATE TABLE review_assignments (
    id bigint GENERATED ALWAYS AS IDENTITY,
    review_month date NOT NULL,
    user_id bigint NOT NULL,
    reviewed_by bigint NOT NULL,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_review_assignments PRIMARY KEY (id)
);
CREATE TABLE installation_requests (
    id bigint GENERATED ALWAYS AS IDENTITY,
    ir_no varchar(30) NOT NULL,
    sales_pro_ir_id int,
    sales_pro_synced_at timestamptz,
    project_id bigint NOT NULL,
    instruction text,
    location_city varchar(100),
    location_address text,
    installation_type_id bigint,
    vendor_id bigint,
    vendor_contact_name varchar(150),
    vendor_contact_no varchar(30),
    installed_by bigint,
    planned_date date,
    installation_date date,
    status varchar(30) NOT NULL,
    customer_contact_name varchar(150),
    customer_contact_no varchar(30),
    customer_remark text,
    customer_signature_url varchar(500),
    installer_name varchar(150),
    installer_contact_no varchar(30),
    installer_remarks text,
    email_copy_to text[],
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_installation_requests PRIMARY KEY (id)
);
CREATE TABLE installation_request_documents (
    id bigint GENERATED ALWAYS AS IDENTITY,
    installation_request_id bigint NOT NULL,
    name varchar(255) NOT NULL,
    doc_type varchar(30),
    file_url varchar(500) NOT NULL,
    source varchar(20) NOT NULL DEFAULT 'upload',
    uploaded_by bigint,
    uploaded_at timestamptz NOT NULL DEFAULT now(),
    legacy_id bigint,
    CONSTRAINT pk_installation_request_documents PRIMARY KEY (id)
);
CREATE TABLE assets (
    id bigint GENERATED ALWAYS AS IDENTITY,
    installation_request_id bigint NOT NULL,
    name varchar(200) NOT NULL,
    asset_type varchar(100),
    make varchar(100),
    supplier varchar(150),
    serial_number varchar(100),
    contract_type varchar(50),
    support_vendor varchar(150),
    coverage varchar(100),
    period varchar(50),
    status varchar(30),
    warranty_start date,
    warranty_end date,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_assets PRIMARY KEY (id)
);
CREATE TABLE upload_types (
    id bigint GENERATED ALWAYS AS IDENTITY,
    name varchar(100) NOT NULL,
    header_line_no smallint NOT NULL DEFAULT 1,
    has_header boolean NOT NULL DEFAULT true,
    first_column varchar(100),
    is_active boolean NOT NULL DEFAULT true,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_upload_types PRIMARY KEY (id)
);
CREATE TABLE upload_type_columns (
    id bigint GENERATED ALWAYS AS IDENTITY,
    upload_type_id bigint NOT NULL,
    source_header varchar(150) NOT NULL,
    target_field varchar(100) NOT NULL,
    validation varchar(255),
    is_date boolean NOT NULL DEFAULT false,
    is_int boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    sort_order int NOT NULL DEFAULT 0,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_upload_type_columns PRIMARY KEY (id)
);
CREATE TABLE uploads (
    id bigint GENERATED ALWAYS AS IDENTITY,
    upload_type_id bigint,
    file_name varchar(255) NOT NULL,
    file_url varchar(500),
    status varchar(20) NOT NULL DEFAULT 'uploaded',
    processed_by bigint,
    processed_at timestamptz,
    row_count int,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_uploads PRIMARY KEY (id)
);
CREATE TABLE upload_errors (
    id bigint GENERATED ALWAYS AS IDENTITY,
    upload_id bigint NOT NULL,
    row_no int NOT NULL,
    message text NOT NULL,
    CONSTRAINT pk_upload_errors PRIMARY KEY (id)
);
CREATE TABLE audit_logs (
    id bigint GENERATED ALWAYS AS IDENTITY,
    entity varchar(50) NOT NULL,
    entity_id bigint NOT NULL,
    action varchar(20) NOT NULL,
    message text,
    changes jsonb,
    user_id bigint,
    logged_at timestamptz NOT NULL DEFAULT now(),
    legacy_id bigint,
    CONSTRAINT pk_audit_logs PRIMARY KEY (id)
);
CREATE TABLE error_logs (
    id bigint GENERATED ALWAYS AS IDENTITY,
    source varchar(200),
    message text NOT NULL,
    stack text,
    logged_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_error_logs PRIMARY KEY (id)
);
CREATE TABLE messages (
    id bigint GENERATED ALWAYS AS IDENTITY,
    code varchar(50) NOT NULL,
    type varchar(20) NOT NULL,
    message_text text NOT NULL,
    legacy_id bigint,
    created_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by bigint,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_messages PRIMARY KEY (id)
);

ALTER TABLE roles ADD CONSTRAINT uq_roles__code UNIQUE (code);
ALTER TABLE role_permissions ADD CONSTRAINT uq_role_permissions__role_id_menu_id UNIQUE (role_id, menu_id);
ALTER TABLE users ADD CONSTRAINT uq_users__emp_code UNIQUE (emp_code);
ALTER TABLE users ADD CONSTRAINT uq_users__username UNIQUE (username);
ALTER TABLE refresh_tokens ADD CONSTRAINT uq_refresh_tokens__token_hash UNIQUE (token_hash);
ALTER TABLE lookups ADD CONSTRAINT uq_lookups__type_name UNIQUE (type, name);
ALTER TABLE teams ADD CONSTRAINT uq_teams__name UNIQUE (name);
ALTER TABLE task_groups ADD CONSTRAINT uq_task_groups__name UNIQUE (name);
ALTER TABLE task_types ADD CONSTRAINT uq_task_types__task_group_id_name UNIQUE (task_group_id, name);
ALTER TABLE weekly_offs ADD CONSTRAINT uq_weekly_offs__code UNIQUE (code);
ALTER TABLE weekly_off_assignments ADD CONSTRAINT uq_weekly_off_assignments__site_id_year UNIQUE (site_id, year);
ALTER TABLE currency_rates ADD CONSTRAINT uq_currency_rates__base_currency_target_currency_effective_from UNIQUE (base_currency, target_currency, effective_from);
ALTER TABLE customers ADD CONSTRAINT uq_customers__code UNIQUE (code);
ALTER TABLE project_divisions ADD CONSTRAINT uq_project_divisions__name UNIQUE (name);
ALTER TABLE project_types ADD CONSTRAINT uq_project_types__name UNIQUE (name);
ALTER TABLE project_type_default_estimates ADD CONSTRAINT uq_project_type_default_estimates__project_type_id_tas_d5822a66 UNIQUE (project_type_id, task_group_id);
ALTER TABLE projects ADD CONSTRAINT uq_projects__code UNIQUE (code);
ALTER TABLE project_commercials ADD CONSTRAINT uq_project_commercials__project_id_year UNIQUE (project_id, year);
ALTER TABLE project_task_group_estimates ADD CONSTRAINT uq_project_task_group_estimates__project_id_task_group_id UNIQUE (project_id, task_group_id);
ALTER TABLE project_members ADD CONSTRAINT uq_project_members__project_id_user_id UNIQUE (project_id, user_id);
ALTER TABLE project_review_task_groups ADD CONSTRAINT uq_project_review_task_groups__project_review_id_task_group_id UNIQUE (project_review_id, task_group_id);
ALTER TABLE task_watchers ADD CONSTRAINT uq_task_watchers__task_id_user_id UNIQUE (task_id, user_id);
ALTER TABLE weekly_plans ADD CONSTRAINT uq_weekly_plans__user_id_week_start UNIQUE (user_id, week_start);
ALTER TABLE weekly_plan_entries ADD CONSTRAINT uq_weekly_plan_entries__weekly_plan_id_project_id_task_type_id UNIQUE (weekly_plan_id, project_id, task_type_id);
ALTER TABLE daily_plans ADD CONSTRAINT uq_daily_plans__user_id_plan_date UNIQUE (user_id, plan_date);
ALTER TABLE attendance ADD CONSTRAINT uq_attendance__user_id_attendance_date UNIQUE (user_id, attendance_date);
ALTER TABLE rosters ADD CONSTRAINT uq_rosters__user_id_roster_date UNIQUE (user_id, roster_date);
ALTER TABLE employee_reviews ADD CONSTRAINT uq_employee_reviews__employee_id_review_period_id UNIQUE (employee_id, review_period_id);
ALTER TABLE ratings ADD CONSTRAINT uq_ratings__user_id_rating_month UNIQUE (user_id, rating_month);
ALTER TABLE review_assignments ADD CONSTRAINT uq_review_assignments__review_month_user_id UNIQUE (review_month, user_id);
ALTER TABLE installation_requests ADD CONSTRAINT uq_installation_requests__ir_no UNIQUE (ir_no);
ALTER TABLE upload_types ADD CONSTRAINT uq_upload_types__name UNIQUE (name);
ALTER TABLE upload_type_columns ADD CONSTRAINT uq_upload_type_columns__upload_type_id_source_header UNIQUE (upload_type_id, source_header);
ALTER TABLE messages ADD CONSTRAINT uq_messages__code UNIQUE (code);
ALTER TABLE roles ADD CONSTRAINT ck_roles__role_type CHECK (role_type IN ('internal', 'external'));
ALTER TABLE roles ADD CONSTRAINT ck_roles__data_scope CHECK (data_scope IN ('all', 'team', 'own', 'customer', 'vendor'));
ALTER TABLE roles ADD CONSTRAINT ck_roles__3 CHECK (level >= 0);
ALTER TABLE resource_grade_costs ADD CONSTRAINT ck_resource_grade_costs__1 CHECK (to_date IS NULL OR to_date >= from_date);
ALTER TABLE weekly_off_rules ADD CONSTRAINT ck_weekly_off_rules__week_day CHECK (week_day IN ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'));
ALTER TABLE project_type_default_estimates ADD CONSTRAINT ck_project_type_default_estimates__1 CHECK (effort_percentage >= 0 AND effort_percentage <= 100);
ALTER TABLE projects ADD CONSTRAINT ck_projects__1 CHECK (end_date IS NULL OR end_date >= start_date);
ALTER TABLE project_task_group_estimates ADD CONSTRAINT ck_project_task_group_estimates__1 CHECK (effort_percentage >= 0 AND effort_percentage <= 100);
ALTER TABLE project_members ADD CONSTRAINT ck_project_members__access_level CHECK (access_level IN ('view', 'advanced_view', 'edit'));
ALTER TABLE project_review_task_groups ADD CONSTRAINT ck_project_review_task_groups__1 CHECK (completion_percentage >= 0 AND completion_percentage <= 100);
ALTER TABLE tasks ADD CONSTRAINT ck_tasks__kind CHECK (kind IN ('project', 'field'));
ALTER TABLE tasks ADD CONSTRAINT ck_tasks__2 CHECK (parent_task_id IS NULL OR parent_task_id <> id);
ALTER TABLE task_checklist_items ADD CONSTRAINT ck_task_checklist_items__status CHECK (status IN ('pending', 'done', 'not_applicable'));
ALTER TABLE weekly_plans ADD CONSTRAINT ck_weekly_plans__status CHECK (status IN ('draft', 'submitted', 'reviewed'));
ALTER TABLE weekly_plans ADD CONSTRAINT ck_weekly_plans__2 CHECK (EXTRACT(ISODOW FROM week_start) = 1);
ALTER TABLE weekly_plans ADD CONSTRAINT ck_weekly_plans__3 CHECK (working_days BETWEEN 1 AND 7);
ALTER TABLE weekly_plan_entries ADD CONSTRAINT ck_weekly_plan_entries__1 CHECK (estimated_minutes >= 0);
ALTER TABLE daily_plans ADD CONSTRAINT ck_daily_plans__status CHECK (status IN ('draft', 'submitted', 'reviewed'));
ALTER TABLE daily_plan_items ADD CONSTRAINT ck_daily_plan_items__status CHECK (status IN ('planned', 'in_progress', 'done', 'carried_over', 'dropped'));
ALTER TABLE daily_plan_items ADD CONSTRAINT ck_daily_plan_items__2 CHECK (task_id IS NOT NULL OR title IS NOT NULL);
ALTER TABLE daily_plan_items ADD CONSTRAINT ck_daily_plan_items__3 CHECK (planned_minutes >= 0);
ALTER TABLE timesheets ADD CONSTRAINT ck_timesheets__1 CHECK (minutes > 0);
ALTER TABLE attendance ADD CONSTRAINT ck_attendance__approval_status CHECK (approval_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE review_periods ADD CONSTRAINT ck_review_periods__1 CHECK (end_date >= start_date);
ALTER TABLE installation_request_documents ADD CONSTRAINT ck_installation_request_documents__source CHECK (source IN ('upload', 'sales_pro'));
ALTER TABLE uploads ADD CONSTRAINT ck_uploads__status CHECK (status IN ('uploaded', 'processing', 'done', 'failed'));
ALTER TABLE audit_logs ADD CONSTRAINT ck_audit_logs__action CHECK (action IN ('create', 'update', 'delete', 'status_change'));
ALTER TABLE messages ADD CONSTRAINT ck_messages__type CHECK (type IN ('info', 'warning', 'error'));

ALTER TABLE roles ADD CONSTRAINT fk_roles__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE roles ADD CONSTRAINT fk_roles__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE menus ADD CONSTRAINT fk_menus__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE menus ADD CONSTRAINT fk_menus__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE role_permissions ADD CONSTRAINT fk_role_permissions__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE role_permissions ADD CONSTRAINT fk_role_permissions__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE users ADD CONSTRAINT fk_users__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE users ADD CONSTRAINT fk_users__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE lookups ADD CONSTRAINT fk_lookups__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE lookups ADD CONSTRAINT fk_lookups__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE teams ADD CONSTRAINT fk_teams__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE teams ADD CONSTRAINT fk_teams__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE sites ADD CONSTRAINT fk_sites__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE sites ADD CONSTRAINT fk_sites__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE shifts ADD CONSTRAINT fk_shifts__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE shifts ADD CONSTRAINT fk_shifts__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE states ADD CONSTRAINT fk_states__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE states ADD CONSTRAINT fk_states__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE cities ADD CONSTRAINT fk_cities__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE cities ADD CONSTRAINT fk_cities__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE resource_grades ADD CONSTRAINT fk_resource_grades__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE resource_grades ADD CONSTRAINT fk_resource_grades__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE resource_grade_costs ADD CONSTRAINT fk_resource_grade_costs__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE resource_grade_costs ADD CONSTRAINT fk_resource_grade_costs__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE task_groups ADD CONSTRAINT fk_task_groups__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE task_groups ADD CONSTRAINT fk_task_groups__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE task_types ADD CONSTRAINT fk_task_types__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE task_types ADD CONSTRAINT fk_task_types__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE weekly_offs ADD CONSTRAINT fk_weekly_offs__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE weekly_offs ADD CONSTRAINT fk_weekly_offs__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE weekly_off_assignments ADD CONSTRAINT fk_weekly_off_assignments__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE weekly_off_assignments ADD CONSTRAINT fk_weekly_off_assignments__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE holidays ADD CONSTRAINT fk_holidays__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE holidays ADD CONSTRAINT fk_holidays__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE currency_rates ADD CONSTRAINT fk_currency_rates__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE currency_rates ADD CONSTRAINT fk_currency_rates__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE customers ADD CONSTRAINT fk_customers__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE customers ADD CONSTRAINT fk_customers__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE customer_locations ADD CONSTRAINT fk_customer_locations__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE customer_locations ADD CONSTRAINT fk_customer_locations__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE vendors ADD CONSTRAINT fk_vendors__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE vendors ADD CONSTRAINT fk_vendors__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE project_divisions ADD CONSTRAINT fk_project_divisions__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE project_divisions ADD CONSTRAINT fk_project_divisions__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE project_types ADD CONSTRAINT fk_project_types__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE project_types ADD CONSTRAINT fk_project_types__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE project_type_default_estimates ADD CONSTRAINT fk_project_type_default_estimates__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE project_type_default_estimates ADD CONSTRAINT fk_project_type_default_estimates__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE project_type_task_templates ADD CONSTRAINT fk_project_type_task_templates__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE project_type_task_templates ADD CONSTRAINT fk_project_type_task_templates__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE projects ADD CONSTRAINT fk_projects__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE projects ADD CONSTRAINT fk_projects__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE project_commercials ADD CONSTRAINT fk_project_commercials__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE project_commercials ADD CONSTRAINT fk_project_commercials__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE project_task_group_estimates ADD CONSTRAINT fk_project_task_group_estimates__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE project_task_group_estimates ADD CONSTRAINT fk_project_task_group_estimates__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE project_members ADD CONSTRAINT fk_project_members__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE project_members ADD CONSTRAINT fk_project_members__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE project_reviews ADD CONSTRAINT fk_project_reviews__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE project_reviews ADD CONSTRAINT fk_project_reviews__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE tasks ADD CONSTRAINT fk_tasks__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE tasks ADD CONSTRAINT fk_tasks__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE task_watchers ADD CONSTRAINT fk_task_watchers__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE task_watchers ADD CONSTRAINT fk_task_watchers__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE task_checklist_items ADD CONSTRAINT fk_task_checklist_items__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE task_checklist_items ADD CONSTRAINT fk_task_checklist_items__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE weekly_plans ADD CONSTRAINT fk_weekly_plans__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE weekly_plans ADD CONSTRAINT fk_weekly_plans__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE weekly_plan_entries ADD CONSTRAINT fk_weekly_plan_entries__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE weekly_plan_entries ADD CONSTRAINT fk_weekly_plan_entries__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE daily_plans ADD CONSTRAINT fk_daily_plans__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE daily_plans ADD CONSTRAINT fk_daily_plans__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE daily_plan_items ADD CONSTRAINT fk_daily_plan_items__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE daily_plan_items ADD CONSTRAINT fk_daily_plan_items__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE timesheets ADD CONSTRAINT fk_timesheets__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE timesheets ADD CONSTRAINT fk_timesheets__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE attendance ADD CONSTRAINT fk_attendance__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE attendance ADD CONSTRAINT fk_attendance__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE rosters ADD CONSTRAINT fk_rosters__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE rosters ADD CONSTRAINT fk_rosters__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE review_periods ADD CONSTRAINT fk_review_periods__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE review_periods ADD CONSTRAINT fk_review_periods__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE review_templates ADD CONSTRAINT fk_review_templates__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE review_templates ADD CONSTRAINT fk_review_templates__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE review_template_kras ADD CONSTRAINT fk_review_template_kras__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE review_template_kras ADD CONSTRAINT fk_review_template_kras__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE review_template_kpis ADD CONSTRAINT fk_review_template_kpis__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE review_template_kpis ADD CONSTRAINT fk_review_template_kpis__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE employee_reviews ADD CONSTRAINT fk_employee_reviews__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE employee_reviews ADD CONSTRAINT fk_employee_reviews__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE employee_review_kras ADD CONSTRAINT fk_employee_review_kras__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE employee_review_kras ADD CONSTRAINT fk_employee_review_kras__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE employee_review_kpis ADD CONSTRAINT fk_employee_review_kpis__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE employee_review_kpis ADD CONSTRAINT fk_employee_review_kpis__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE ratings ADD CONSTRAINT fk_ratings__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE ratings ADD CONSTRAINT fk_ratings__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE points ADD CONSTRAINT fk_points__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE points ADD CONSTRAINT fk_points__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE review_assignments ADD CONSTRAINT fk_review_assignments__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE review_assignments ADD CONSTRAINT fk_review_assignments__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE installation_requests ADD CONSTRAINT fk_installation_requests__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE installation_requests ADD CONSTRAINT fk_installation_requests__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE assets ADD CONSTRAINT fk_assets__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE assets ADD CONSTRAINT fk_assets__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE upload_types ADD CONSTRAINT fk_upload_types__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE upload_types ADD CONSTRAINT fk_upload_types__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE upload_type_columns ADD CONSTRAINT fk_upload_type_columns__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE upload_type_columns ADD CONSTRAINT fk_upload_type_columns__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE uploads ADD CONSTRAINT fk_uploads__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE uploads ADD CONSTRAINT fk_uploads__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE messages ADD CONSTRAINT fk_messages__created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE messages ADD CONSTRAINT fk_messages__updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE menus ADD CONSTRAINT fk_menus__parent_id FOREIGN KEY (parent_id) REFERENCES menus (id) ON DELETE RESTRICT;
ALTER TABLE role_permissions ADD CONSTRAINT fk_role_permissions__role_id FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE;
ALTER TABLE role_permissions ADD CONSTRAINT fk_role_permissions__menu_id FOREIGN KEY (menu_id) REFERENCES menus (id) ON DELETE CASCADE;
ALTER TABLE users ADD CONSTRAINT fk_users__role_id FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE RESTRICT;
ALTER TABLE users ADD CONSTRAINT fk_users__user_type_id FOREIGN KEY (user_type_id) REFERENCES lookups (id) ON DELETE RESTRICT;
ALTER TABLE users ADD CONSTRAINT fk_users__shift_id FOREIGN KEY (shift_id) REFERENCES shifts (id) ON DELETE RESTRICT;
ALTER TABLE users ADD CONSTRAINT fk_users__site_id FOREIGN KEY (site_id) REFERENCES sites (id) ON DELETE RESTRICT;
ALTER TABLE users ADD CONSTRAINT fk_users__resource_grade_id FOREIGN KEY (resource_grade_id) REFERENCES resource_grades (id) ON DELETE RESTRICT;
ALTER TABLE users ADD CONSTRAINT fk_users__vendor_id FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE RESTRICT;
ALTER TABLE users ADD CONSTRAINT fk_users__customer_id FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE RESTRICT;
ALTER TABLE users ADD CONSTRAINT fk_users__reports_to FOREIGN KEY (reports_to) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE users ADD CONSTRAINT fk_users__reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE user_teams ADD CONSTRAINT fk_user_teams__user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE user_teams ADD CONSTRAINT fk_user_teams__team_id FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE;
ALTER TABLE refresh_tokens ADD CONSTRAINT fk_refresh_tokens__user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE teams ADD CONSTRAINT fk_teams__country_id FOREIGN KEY (country_id) REFERENCES lookups (id) ON DELETE RESTRICT;
ALTER TABLE cities ADD CONSTRAINT fk_cities__state_id FOREIGN KEY (state_id) REFERENCES states (id) ON DELETE RESTRICT;
ALTER TABLE resource_grades ADD CONSTRAINT fk_resource_grades__grade_id FOREIGN KEY (grade_id) REFERENCES lookups (id) ON DELETE RESTRICT;
ALTER TABLE resource_grades ADD CONSTRAINT fk_resource_grades__team_id FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE RESTRICT;
ALTER TABLE resource_grade_costs ADD CONSTRAINT fk_resource_grade_costs__resource_grade_id FOREIGN KEY (resource_grade_id) REFERENCES resource_grades (id) ON DELETE CASCADE;
ALTER TABLE task_types ADD CONSTRAINT fk_task_types__task_group_id FOREIGN KEY (task_group_id) REFERENCES task_groups (id) ON DELETE RESTRICT;
ALTER TABLE weekly_off_rules ADD CONSTRAINT fk_weekly_off_rules__weekly_off_id FOREIGN KEY (weekly_off_id) REFERENCES weekly_offs (id) ON DELETE CASCADE;
ALTER TABLE weekly_off_assignments ADD CONSTRAINT fk_weekly_off_assignments__weekly_off_id FOREIGN KEY (weekly_off_id) REFERENCES weekly_offs (id) ON DELETE CASCADE;
ALTER TABLE weekly_off_assignments ADD CONSTRAINT fk_weekly_off_assignments__site_id FOREIGN KEY (site_id) REFERENCES sites (id) ON DELETE RESTRICT;
ALTER TABLE holidays ADD CONSTRAINT fk_holidays__country_id FOREIGN KEY (country_id) REFERENCES lookups (id) ON DELETE RESTRICT;
ALTER TABLE holidays ADD CONSTRAINT fk_holidays__site_id FOREIGN KEY (site_id) REFERENCES sites (id) ON DELETE RESTRICT;
ALTER TABLE holidays ADD CONSTRAINT fk_holidays__weekly_off_id FOREIGN KEY (weekly_off_id) REFERENCES weekly_offs (id) ON DELETE RESTRICT;
ALTER TABLE customers ADD CONSTRAINT fk_customers__country_id FOREIGN KEY (country_id) REFERENCES lookups (id) ON DELETE RESTRICT;
ALTER TABLE customer_locations ADD CONSTRAINT fk_customer_locations__customer_id FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE RESTRICT;
ALTER TABLE customer_locations ADD CONSTRAINT fk_customer_locations__city_id FOREIGN KEY (city_id) REFERENCES cities (id) ON DELETE RESTRICT;
ALTER TABLE customer_locations ADD CONSTRAINT fk_customer_locations__state_id FOREIGN KEY (state_id) REFERENCES states (id) ON DELETE RESTRICT;
ALTER TABLE vendors ADD CONSTRAINT fk_vendors__city_id FOREIGN KEY (city_id) REFERENCES cities (id) ON DELETE RESTRICT;
ALTER TABLE vendors ADD CONSTRAINT fk_vendors__state_id FOREIGN KEY (state_id) REFERENCES states (id) ON DELETE RESTRICT;
ALTER TABLE vendors ADD CONSTRAINT fk_vendors__country_id FOREIGN KEY (country_id) REFERENCES lookups (id) ON DELETE RESTRICT;
ALTER TABLE vendors ADD CONSTRAINT fk_vendors__category_id FOREIGN KEY (category_id) REFERENCES lookups (id) ON DELETE RESTRICT;
ALTER TABLE vendors ADD CONSTRAINT fk_vendors__organisation_status_id FOREIGN KEY (organisation_status_id) REFERENCES lookups (id) ON DELETE RESTRICT;
ALTER TABLE vendors ADD CONSTRAINT fk_vendors__payment_mode_id FOREIGN KEY (payment_mode_id) REFERENCES lookups (id) ON DELETE RESTRICT;
ALTER TABLE project_type_default_estimates ADD CONSTRAINT fk_project_type_default_estimates__project_type_id FOREIGN KEY (project_type_id) REFERENCES project_types (id) ON DELETE CASCADE;
ALTER TABLE project_type_default_estimates ADD CONSTRAINT fk_project_type_default_estimates__task_group_id FOREIGN KEY (task_group_id) REFERENCES task_groups (id) ON DELETE RESTRICT;
ALTER TABLE project_type_task_templates ADD CONSTRAINT fk_project_type_task_templates__project_type_id FOREIGN KEY (project_type_id) REFERENCES project_types (id) ON DELETE CASCADE;
ALTER TABLE project_type_task_templates ADD CONSTRAINT fk_project_type_task_templates__task_group_id FOREIGN KEY (task_group_id) REFERENCES task_groups (id) ON DELETE RESTRICT;
ALTER TABLE project_type_task_templates ADD CONSTRAINT fk_project_type_task_templates__task_type_id FOREIGN KEY (task_type_id) REFERENCES task_types (id) ON DELETE RESTRICT;
ALTER TABLE projects ADD CONSTRAINT fk_projects__project_division_id FOREIGN KEY (project_division_id) REFERENCES project_divisions (id) ON DELETE RESTRICT;
ALTER TABLE projects ADD CONSTRAINT fk_projects__project_type_id FOREIGN KEY (project_type_id) REFERENCES project_types (id) ON DELETE RESTRICT;
ALTER TABLE projects ADD CONSTRAINT fk_projects__customer_id FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE RESTRICT;
ALTER TABLE projects ADD CONSTRAINT fk_projects__owner_id FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE project_commercials ADD CONSTRAINT fk_project_commercials__project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE;
ALTER TABLE project_task_group_estimates ADD CONSTRAINT fk_project_task_group_estimates__project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE;
ALTER TABLE project_task_group_estimates ADD CONSTRAINT fk_project_task_group_estimates__task_group_id FOREIGN KEY (task_group_id) REFERENCES task_groups (id) ON DELETE RESTRICT;
ALTER TABLE project_members ADD CONSTRAINT fk_project_members__project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE;
ALTER TABLE project_members ADD CONSTRAINT fk_project_members__user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE project_reviews ADD CONSTRAINT fk_project_reviews__project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE;
ALTER TABLE project_review_task_groups ADD CONSTRAINT fk_project_review_task_groups__project_review_id FOREIGN KEY (project_review_id) REFERENCES project_reviews (id) ON DELETE CASCADE;
ALTER TABLE project_review_task_groups ADD CONSTRAINT fk_project_review_task_groups__task_group_id FOREIGN KEY (task_group_id) REFERENCES task_groups (id) ON DELETE RESTRICT;
ALTER TABLE tasks ADD CONSTRAINT fk_tasks__customer_id FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE RESTRICT;
ALTER TABLE tasks ADD CONSTRAINT fk_tasks__project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE RESTRICT;
ALTER TABLE tasks ADD CONSTRAINT fk_tasks__parent_task_id FOREIGN KEY (parent_task_id) REFERENCES tasks (id) ON DELETE RESTRICT;
ALTER TABLE tasks ADD CONSTRAINT fk_tasks__predecessor_task_id FOREIGN KEY (predecessor_task_id) REFERENCES tasks (id) ON DELETE RESTRICT;
ALTER TABLE tasks ADD CONSTRAINT fk_tasks__task_group_id FOREIGN KEY (task_group_id) REFERENCES task_groups (id) ON DELETE RESTRICT;
ALTER TABLE tasks ADD CONSTRAINT fk_tasks__task_type_id FOREIGN KEY (task_type_id) REFERENCES task_types (id) ON DELETE RESTRICT;
ALTER TABLE tasks ADD CONSTRAINT fk_tasks__assigned_to FOREIGN KEY (assigned_to) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE tasks ADD CONSTRAINT fk_tasks__owner_id FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE task_watchers ADD CONSTRAINT fk_task_watchers__task_id FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE;
ALTER TABLE task_watchers ADD CONSTRAINT fk_task_watchers__user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE task_teams ADD CONSTRAINT fk_task_teams__task_id FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE;
ALTER TABLE task_teams ADD CONSTRAINT fk_task_teams__team_id FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE;
ALTER TABLE task_checklist_items ADD CONSTRAINT fk_task_checklist_items__task_id FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE;
ALTER TABLE task_checklist_items ADD CONSTRAINT fk_task_checklist_items__completed_by FOREIGN KEY (completed_by) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE weekly_plans ADD CONSTRAINT fk_weekly_plans__user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE weekly_plans ADD CONSTRAINT fk_weekly_plans__reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE weekly_plan_entries ADD CONSTRAINT fk_weekly_plan_entries__weekly_plan_id FOREIGN KEY (weekly_plan_id) REFERENCES weekly_plans (id) ON DELETE CASCADE;
ALTER TABLE weekly_plan_entries ADD CONSTRAINT fk_weekly_plan_entries__project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE RESTRICT;
ALTER TABLE weekly_plan_entries ADD CONSTRAINT fk_weekly_plan_entries__task_type_id FOREIGN KEY (task_type_id) REFERENCES task_types (id) ON DELETE RESTRICT;
ALTER TABLE daily_plans ADD CONSTRAINT fk_daily_plans__user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE daily_plans ADD CONSTRAINT fk_daily_plans__weekly_plan_id FOREIGN KEY (weekly_plan_id) REFERENCES weekly_plans (id) ON DELETE SET NULL;
ALTER TABLE daily_plans ADD CONSTRAINT fk_daily_plans__reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE daily_plan_items ADD CONSTRAINT fk_daily_plan_items__daily_plan_id FOREIGN KEY (daily_plan_id) REFERENCES daily_plans (id) ON DELETE CASCADE;
ALTER TABLE daily_plan_items ADD CONSTRAINT fk_daily_plan_items__task_id FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE SET NULL;
ALTER TABLE daily_plan_items ADD CONSTRAINT fk_daily_plan_items__project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE RESTRICT;
ALTER TABLE daily_plan_items ADD CONSTRAINT fk_daily_plan_items__task_type_id FOREIGN KEY (task_type_id) REFERENCES task_types (id) ON DELETE RESTRICT;
ALTER TABLE daily_plan_items ADD CONSTRAINT fk_daily_plan_items__weekly_plan_entry_id FOREIGN KEY (weekly_plan_entry_id) REFERENCES weekly_plan_entries (id) ON DELETE SET NULL;
ALTER TABLE timesheets ADD CONSTRAINT fk_timesheets__user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE timesheets ADD CONSTRAINT fk_timesheets__project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE RESTRICT;
ALTER TABLE timesheets ADD CONSTRAINT fk_timesheets__task_type_id FOREIGN KEY (task_type_id) REFERENCES task_types (id) ON DELETE RESTRICT;
ALTER TABLE timesheets ADD CONSTRAINT fk_timesheets__task_id FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE RESTRICT;
ALTER TABLE timesheets ADD CONSTRAINT fk_timesheets__daily_plan_item_id FOREIGN KEY (daily_plan_item_id) REFERENCES daily_plan_items (id) ON DELETE SET NULL;
ALTER TABLE attendance ADD CONSTRAINT fk_attendance__user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE attendance ADD CONSTRAINT fk_attendance__shift_id FOREIGN KEY (shift_id) REFERENCES shifts (id) ON DELETE RESTRICT;
ALTER TABLE attendance ADD CONSTRAINT fk_attendance__marked_by FOREIGN KEY (marked_by) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE attendance ADD CONSTRAINT fk_attendance__approved_by FOREIGN KEY (approved_by) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE rosters ADD CONSTRAINT fk_rosters__user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE rosters ADD CONSTRAINT fk_rosters__shift_id FOREIGN KEY (shift_id) REFERENCES shifts (id) ON DELETE RESTRICT;
ALTER TABLE biometric_logs ADD CONSTRAINT fk_biometric_logs__user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE biometric_logs ADD CONSTRAINT fk_biometric_logs__upload_id FOREIGN KEY (upload_id) REFERENCES uploads (id) ON DELETE SET NULL;
ALTER TABLE mood_logs ADD CONSTRAINT fk_mood_logs__user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE review_templates ADD CONSTRAINT fk_review_templates__review_period_id FOREIGN KEY (review_period_id) REFERENCES review_periods (id) ON DELETE RESTRICT;
ALTER TABLE review_template_kras ADD CONSTRAINT fk_review_template_kras__review_template_id FOREIGN KEY (review_template_id) REFERENCES review_templates (id) ON DELETE CASCADE;
ALTER TABLE review_template_kpis ADD CONSTRAINT fk_review_template_kpis__review_template_kra_id FOREIGN KEY (review_template_kra_id) REFERENCES review_template_kras (id) ON DELETE CASCADE;
ALTER TABLE employee_reviews ADD CONSTRAINT fk_employee_reviews__employee_id FOREIGN KEY (employee_id) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE employee_reviews ADD CONSTRAINT fk_employee_reviews__reviewer_id FOREIGN KEY (reviewer_id) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE employee_reviews ADD CONSTRAINT fk_employee_reviews__hr_id FOREIGN KEY (hr_id) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE employee_reviews ADD CONSTRAINT fk_employee_reviews__review_period_id FOREIGN KEY (review_period_id) REFERENCES review_periods (id) ON DELETE RESTRICT;
ALTER TABLE employee_reviews ADD CONSTRAINT fk_employee_reviews__review_template_id FOREIGN KEY (review_template_id) REFERENCES review_templates (id) ON DELETE RESTRICT;
ALTER TABLE employee_review_kras ADD CONSTRAINT fk_employee_review_kras__employee_review_id FOREIGN KEY (employee_review_id) REFERENCES employee_reviews (id) ON DELETE CASCADE;
ALTER TABLE employee_review_kpis ADD CONSTRAINT fk_employee_review_kpis__employee_review_kra_id FOREIGN KEY (employee_review_kra_id) REFERENCES employee_review_kras (id) ON DELETE CASCADE;
ALTER TABLE ratings ADD CONSTRAINT fk_ratings__user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE ratings ADD CONSTRAINT fk_ratings__reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE points ADD CONSTRAINT fk_points__user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE points ADD CONSTRAINT fk_points__reviewer_id FOREIGN KEY (reviewer_id) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE review_assignments ADD CONSTRAINT fk_review_assignments__user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE review_assignments ADD CONSTRAINT fk_review_assignments__reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE installation_requests ADD CONSTRAINT fk_installation_requests__project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE RESTRICT;
ALTER TABLE installation_requests ADD CONSTRAINT fk_installation_requests__installation_type_id FOREIGN KEY (installation_type_id) REFERENCES lookups (id) ON DELETE RESTRICT;
ALTER TABLE installation_requests ADD CONSTRAINT fk_installation_requests__vendor_id FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE RESTRICT;
ALTER TABLE installation_requests ADD CONSTRAINT fk_installation_requests__installed_by FOREIGN KEY (installed_by) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE installation_request_documents ADD CONSTRAINT fk_installation_request_documents__installation_request_id FOREIGN KEY (installation_request_id) REFERENCES installation_requests (id) ON DELETE CASCADE;
ALTER TABLE installation_request_documents ADD CONSTRAINT fk_installation_request_documents__uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE assets ADD CONSTRAINT fk_assets__installation_request_id FOREIGN KEY (installation_request_id) REFERENCES installation_requests (id) ON DELETE RESTRICT;
ALTER TABLE upload_type_columns ADD CONSTRAINT fk_upload_type_columns__upload_type_id FOREIGN KEY (upload_type_id) REFERENCES upload_types (id) ON DELETE CASCADE;
ALTER TABLE uploads ADD CONSTRAINT fk_uploads__upload_type_id FOREIGN KEY (upload_type_id) REFERENCES upload_types (id) ON DELETE RESTRICT;
ALTER TABLE uploads ADD CONSTRAINT fk_uploads__processed_by FOREIGN KEY (processed_by) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE upload_errors ADD CONSTRAINT fk_upload_errors__upload_id FOREIGN KEY (upload_id) REFERENCES uploads (id) ON DELETE CASCADE;
ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_logs__user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT;

CREATE INDEX ix_roles__level ON roles (level);
CREATE INDEX ix_menus__parent_id ON menus (parent_id);
CREATE INDEX ix_role_permissions__menu_id ON role_permissions (menu_id);
CREATE INDEX ix_users__email ON users (email);
CREATE INDEX ix_users__is_active ON users (is_active);
CREATE INDEX ix_users__role_id ON users (role_id);
CREATE INDEX ix_users__user_type_id ON users (user_type_id);
CREATE INDEX ix_users__shift_id ON users (shift_id);
CREATE INDEX ix_users__site_id ON users (site_id);
CREATE INDEX ix_users__resource_grade_id ON users (resource_grade_id);
CREATE INDEX ix_users__vendor_id ON users (vendor_id);
CREATE INDEX ix_users__customer_id ON users (customer_id);
CREATE INDEX ix_users__reports_to ON users (reports_to);
CREATE INDEX ix_users__reviewed_by ON users (reviewed_by);
CREATE INDEX ix_user_teams__team_id ON user_teams (team_id);
CREATE INDEX ix_refresh_tokens__expires_at ON refresh_tokens (expires_at);
CREATE INDEX ix_refresh_tokens__user_id ON refresh_tokens (user_id);
CREATE INDEX ix_teams__country_id ON teams (country_id);
CREATE INDEX ix_cities__state_id ON cities (state_id);
CREATE INDEX ix_resource_grades__grade_id ON resource_grades (grade_id);
CREATE INDEX ix_resource_grades__team_id ON resource_grades (team_id);
CREATE INDEX ix_resource_grade_costs__resource_grade_id ON resource_grade_costs (resource_grade_id);
CREATE INDEX ix_weekly_off_rules__weekly_off_id ON weekly_off_rules (weekly_off_id);
CREATE INDEX ix_weekly_off_assignments__weekly_off_id ON weekly_off_assignments (weekly_off_id);
CREATE INDEX ix_holidays__site_id_holiday_date ON holidays (site_id, holiday_date);
CREATE INDEX ix_holidays__country_id ON holidays (country_id);
CREATE INDEX ix_holidays__weekly_off_id ON holidays (weekly_off_id);
CREATE INDEX ix_customers__country_id ON customers (country_id);
CREATE INDEX ix_customer_locations__customer_id ON customer_locations (customer_id);
CREATE INDEX ix_customer_locations__city_id ON customer_locations (city_id);
CREATE INDEX ix_customer_locations__state_id ON customer_locations (state_id);
CREATE INDEX ix_vendors__city_id ON vendors (city_id);
CREATE INDEX ix_vendors__state_id ON vendors (state_id);
CREATE INDEX ix_vendors__country_id ON vendors (country_id);
CREATE INDEX ix_vendors__category_id ON vendors (category_id);
CREATE INDEX ix_vendors__organisation_status_id ON vendors (organisation_status_id);
CREATE INDEX ix_vendors__payment_mode_id ON vendors (payment_mode_id);
CREATE INDEX ix_project_type_default_estimates__task_group_id ON project_type_default_estimates (task_group_id);
CREATE INDEX ix_project_type_task_templates__project_type_id ON project_type_task_templates (project_type_id);
CREATE INDEX ix_project_type_task_templates__task_group_id ON project_type_task_templates (task_group_id);
CREATE INDEX ix_project_type_task_templates__task_type_id ON project_type_task_templates (task_type_id);
CREATE INDEX ix_projects__status ON projects (status);
CREATE INDEX ix_projects__project_division_id ON projects (project_division_id);
CREATE INDEX ix_projects__project_type_id ON projects (project_type_id);
CREATE INDEX ix_projects__customer_id ON projects (customer_id);
CREATE INDEX ix_projects__owner_id ON projects (owner_id);
CREATE INDEX ix_project_task_group_estimates__task_group_id ON project_task_group_estimates (task_group_id);
CREATE INDEX ix_project_members__user_id ON project_members (user_id);
CREATE INDEX ix_project_reviews__project_id_review_date ON project_reviews (project_id, review_date);
CREATE INDEX ix_project_review_task_groups__task_group_id ON project_review_task_groups (task_group_id);
CREATE INDEX ix_tasks__project_id_status ON tasks (project_id, status);
CREATE INDEX ix_tasks__assigned_to_status ON tasks (assigned_to, status);
CREATE INDEX ix_tasks__planned_end ON tasks (planned_end);
CREATE INDEX ix_tasks__customer_id ON tasks (customer_id);
CREATE INDEX ix_tasks__parent_task_id ON tasks (parent_task_id);
CREATE INDEX ix_tasks__predecessor_task_id ON tasks (predecessor_task_id);
CREATE INDEX ix_tasks__task_group_id ON tasks (task_group_id);
CREATE INDEX ix_tasks__task_type_id ON tasks (task_type_id);
CREATE INDEX ix_tasks__owner_id ON tasks (owner_id);
CREATE INDEX ix_task_watchers__user_id ON task_watchers (user_id);
CREATE INDEX ix_task_teams__team_id ON task_teams (team_id);
CREATE INDEX ix_task_checklist_items__task_id ON task_checklist_items (task_id);
CREATE INDEX ix_task_checklist_items__completed_by ON task_checklist_items (completed_by);
CREATE INDEX ix_weekly_plans__week_start_status ON weekly_plans (week_start, status);
CREATE INDEX ix_weekly_plans__reviewed_by ON weekly_plans (reviewed_by);
CREATE INDEX ix_weekly_plan_entries__project_id ON weekly_plan_entries (project_id);
CREATE INDEX ix_weekly_plan_entries__task_type_id ON weekly_plan_entries (task_type_id);
CREATE INDEX ix_daily_plans__plan_date_status ON daily_plans (plan_date, status);
CREATE INDEX ix_daily_plans__weekly_plan_id ON daily_plans (weekly_plan_id);
CREATE INDEX ix_daily_plans__reviewed_by ON daily_plans (reviewed_by);
CREATE INDEX ix_daily_plan_items__daily_plan_id ON daily_plan_items (daily_plan_id);
CREATE INDEX ix_daily_plan_items__task_id ON daily_plan_items (task_id);
CREATE INDEX ix_daily_plan_items__project_id ON daily_plan_items (project_id);
CREATE INDEX ix_daily_plan_items__task_type_id ON daily_plan_items (task_type_id);
CREATE INDEX ix_daily_plan_items__weekly_plan_entry_id ON daily_plan_items (weekly_plan_entry_id);
CREATE INDEX ix_timesheets__user_id_work_date ON timesheets (user_id, work_date);
CREATE INDEX ix_timesheets__project_id_work_date ON timesheets (project_id, work_date);
CREATE INDEX ix_timesheets__project_id_task_type_id ON timesheets (project_id, task_type_id);
CREATE INDEX ix_timesheets__task_type_id ON timesheets (task_type_id);
CREATE INDEX ix_timesheets__task_id ON timesheets (task_id);
CREATE INDEX ix_timesheets__daily_plan_item_id ON timesheets (daily_plan_item_id);
CREATE INDEX ix_attendance__attendance_date ON attendance (attendance_date);
CREATE INDEX ix_attendance__shift_id ON attendance (shift_id);
CREATE INDEX ix_attendance__marked_by ON attendance (marked_by);
CREATE INDEX ix_attendance__approved_by ON attendance (approved_by);
CREATE INDEX ix_rosters__shift_id ON rosters (shift_id);
CREATE INDEX ix_biometric_logs__user_id_log_at ON biometric_logs (user_id, log_at);
CREATE INDEX ix_biometric_logs__upload_id ON biometric_logs (upload_id);
CREATE INDEX ix_mood_logs__user_id_mood_date ON mood_logs (user_id, mood_date);
CREATE INDEX ix_review_templates__review_period_id ON review_templates (review_period_id);
CREATE INDEX ix_review_template_kras__review_template_id ON review_template_kras (review_template_id);
CREATE INDEX ix_review_template_kpis__review_template_kra_id ON review_template_kpis (review_template_kra_id);
CREATE INDEX ix_employee_reviews__reviewer_id ON employee_reviews (reviewer_id);
CREATE INDEX ix_employee_reviews__hr_id ON employee_reviews (hr_id);
CREATE INDEX ix_employee_reviews__review_period_id ON employee_reviews (review_period_id);
CREATE INDEX ix_employee_reviews__review_template_id ON employee_reviews (review_template_id);
CREATE INDEX ix_employee_review_kras__employee_review_id ON employee_review_kras (employee_review_id);
CREATE INDEX ix_employee_review_kpis__employee_review_kra_id ON employee_review_kpis (employee_review_kra_id);
CREATE INDEX ix_ratings__reviewed_by ON ratings (reviewed_by);
CREATE INDEX ix_points__user_id ON points (user_id);
CREATE INDEX ix_points__reviewer_id ON points (reviewer_id);
CREATE INDEX ix_review_assignments__user_id ON review_assignments (user_id);
CREATE INDEX ix_review_assignments__reviewed_by ON review_assignments (reviewed_by);
CREATE INDEX ix_installation_requests__sales_pro_ir_id ON installation_requests (sales_pro_ir_id);
CREATE INDEX ix_installation_requests__status ON installation_requests (status);
CREATE INDEX ix_installation_requests__project_id ON installation_requests (project_id);
CREATE INDEX ix_installation_requests__installation_type_id ON installation_requests (installation_type_id);
CREATE INDEX ix_installation_requests__vendor_id ON installation_requests (vendor_id);
CREATE INDEX ix_installation_requests__installed_by ON installation_requests (installed_by);
CREATE INDEX ix_installation_request_documents__installation_request_id ON installation_request_documents (installation_request_id);
CREATE INDEX ix_installation_request_documents__uploaded_by ON installation_request_documents (uploaded_by);
CREATE INDEX ix_assets__serial_number ON assets (serial_number);
CREATE INDEX ix_assets__warranty_end ON assets (warranty_end);
CREATE INDEX ix_assets__installation_request_id ON assets (installation_request_id);
CREATE INDEX ix_uploads__upload_type_id ON uploads (upload_type_id);
CREATE INDEX ix_uploads__processed_by ON uploads (processed_by);
CREATE INDEX ix_upload_errors__upload_id ON upload_errors (upload_id);
CREATE INDEX ix_audit_logs__entity_entity_id_logged_at ON audit_logs (entity, entity_id, logged_at);
CREATE INDEX ix_audit_logs__user_id ON audit_logs (user_id);
CREATE INDEX ix_error_logs__logged_at ON error_logs (logged_at);

CREATE TRIGGER trg_roles__updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_menus__updated_at BEFORE UPDATE ON menus FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_role_permissions__updated_at BEFORE UPDATE ON role_permissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users__updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_lookups__updated_at BEFORE UPDATE ON lookups FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_teams__updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sites__updated_at BEFORE UPDATE ON sites FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_shifts__updated_at BEFORE UPDATE ON shifts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_states__updated_at BEFORE UPDATE ON states FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_cities__updated_at BEFORE UPDATE ON cities FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_resource_grades__updated_at BEFORE UPDATE ON resource_grades FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_resource_grade_costs__updated_at BEFORE UPDATE ON resource_grade_costs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_task_groups__updated_at BEFORE UPDATE ON task_groups FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_task_types__updated_at BEFORE UPDATE ON task_types FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_weekly_offs__updated_at BEFORE UPDATE ON weekly_offs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_weekly_off_assignments__updated_at BEFORE UPDATE ON weekly_off_assignments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_holidays__updated_at BEFORE UPDATE ON holidays FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_currency_rates__updated_at BEFORE UPDATE ON currency_rates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_customers__updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_customer_locations__updated_at BEFORE UPDATE ON customer_locations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_vendors__updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_project_divisions__updated_at BEFORE UPDATE ON project_divisions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_project_types__updated_at BEFORE UPDATE ON project_types FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_project_type_default_estimates__updated_at BEFORE UPDATE ON project_type_default_estimates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_project_type_task_templates__updated_at BEFORE UPDATE ON project_type_task_templates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_projects__updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_project_commercials__updated_at BEFORE UPDATE ON project_commercials FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_project_task_group_estimates__updated_at BEFORE UPDATE ON project_task_group_estimates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_project_members__updated_at BEFORE UPDATE ON project_members FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_project_reviews__updated_at BEFORE UPDATE ON project_reviews FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tasks__updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_task_watchers__updated_at BEFORE UPDATE ON task_watchers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_task_checklist_items__updated_at BEFORE UPDATE ON task_checklist_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_weekly_plans__updated_at BEFORE UPDATE ON weekly_plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_weekly_plan_entries__updated_at BEFORE UPDATE ON weekly_plan_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_daily_plans__updated_at BEFORE UPDATE ON daily_plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_daily_plan_items__updated_at BEFORE UPDATE ON daily_plan_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_timesheets__updated_at BEFORE UPDATE ON timesheets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_attendance__updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_rosters__updated_at BEFORE UPDATE ON rosters FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_review_periods__updated_at BEFORE UPDATE ON review_periods FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_review_templates__updated_at BEFORE UPDATE ON review_templates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_review_template_kras__updated_at BEFORE UPDATE ON review_template_kras FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_review_template_kpis__updated_at BEFORE UPDATE ON review_template_kpis FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_employee_reviews__updated_at BEFORE UPDATE ON employee_reviews FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_employee_review_kras__updated_at BEFORE UPDATE ON employee_review_kras FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_employee_review_kpis__updated_at BEFORE UPDATE ON employee_review_kpis FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_ratings__updated_at BEFORE UPDATE ON ratings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_points__updated_at BEFORE UPDATE ON points FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_review_assignments__updated_at BEFORE UPDATE ON review_assignments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_installation_requests__updated_at BEFORE UPDATE ON installation_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_assets__updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_upload_types__updated_at BEFORE UPDATE ON upload_types FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_upload_type_columns__updated_at BEFORE UPDATE ON upload_type_columns FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_uploads__updated_at BEFORE UPDATE ON uploads FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_messages__updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE roles IS 'Roles with level-based access (0 = Super Admin, lower = more authority)';
COMMENT ON COLUMN roles.code IS 'stable key used in code, e.g. SUPER_ADMIN';
COMMENT ON COLUMN roles.level IS '0 = highest authority';
COMMENT ON COLUMN roles.role_type IS 'external = customer / vendor logins';
COMMENT ON COLUMN roles.data_scope IS 'which records the role can see';
COMMENT ON COLUMN roles.is_system IS 'built-in role; cannot be deleted or renamed';
COMMENT ON TABLE menus IS 'Side-menu items and screens';
COMMENT ON COLUMN menus.parent_id IS 'null for top level';
COMMENT ON COLUMN menus.url IS 'React route; used by the route guard';
COMMENT ON TABLE role_permissions IS 'Actions a role may perform on each menu / screen';
COMMENT ON TABLE users IS 'Application users (employees, customer and vendor logins)';
COMMENT ON COLUMN users.password_hash IS 'bcrypt / argon2; old passwords must be reset or re-hashed';
COMMENT ON COLUMN users.user_type_id IS 'lookup type USER_TYPE';
COMMENT ON COLUMN users.time_zone IS 'IANA zone; replaces TimeOffsetID';
COMMENT ON COLUMN users.vendor_id IS 'set for vendor logins';
COMMENT ON COLUMN users.customer_id IS 'set for customer logins';
COMMENT ON COLUMN users.hourly_rate_currency IS 'ISO code';
COMMENT ON TABLE user_teams IS 'Teams a user belongs to (shown on the project Users tab)';
COMMENT ON COLUMN user_teams.position IS 'position of the user in this team, e.g. Team Lead, Developer (shown on the project Users tab)';
COMMENT ON TABLE refresh_tokens IS 'JWT refresh tokens';
COMMENT ON TABLE lookups IS 'Admin-editable lists (country, currency, server type, vendor category, user type…)';
COMMENT ON COLUMN lookups.type IS 'e.g. COUNTRY, SERVER_TYPE, VENDOR_CATEGORY, PAYMENT_MODE, USER_TYPE, GRADE';
COMMENT ON TABLE teams IS 'Teams';
COMMENT ON TABLE sites IS 'Office sites';
COMMENT ON TABLE shifts IS 'Work shifts';
COMMENT ON TABLE states IS 'States';
COMMENT ON TABLE cities IS 'Cities';
COMMENT ON TABLE resource_grades IS 'Resource grade per team';
COMMENT ON COLUMN resource_grades.grade_id IS 'lookup type GRADE';
COMMENT ON TABLE resource_grade_costs IS 'Cost-per-hour history for a resource grade';
COMMENT ON TABLE task_groups IS 'Task groups';
COMMENT ON TABLE task_types IS 'Task types (Analysis, UX/UI, Development, Post Live Support…)';
COMMENT ON COLUMN task_types.completion_certificate IS 'template / file URL';
COMMENT ON TABLE weekly_offs IS 'Weekly-off patterns';
COMMENT ON TABLE weekly_off_rules IS 'Days off within a weekly-off pattern';
COMMENT ON COLUMN weekly_off_rules.off_weeks IS 'e.g. all, 1,3 (which weeks of the month)';
COMMENT ON TABLE weekly_off_assignments IS 'Which sites use a weekly-off pattern in a year';
COMMENT ON TABLE holidays IS 'Holidays per site / country';
COMMENT ON TABLE currency_rates IS 'Currency conversion rates';
COMMENT ON TABLE customers IS 'Customers';
COMMENT ON TABLE customer_locations IS 'Customer locations (also used as project / task locations)';
COMMENT ON TABLE vendors IS 'Vendors (Swan installation / field-task vendors)';
COMMENT ON COLUMN vendors.bank_account_number IS 'ENCRYPT';
COMMENT ON TABLE project_divisions IS 'Project divisions (Web, Software)';
COMMENT ON TABLE project_types IS 'Project types (Website Development, Website Tech Support, Digital Marketing Full, SEO & Google Ads, Corporate Video…)';
COMMENT ON TABLE project_type_default_estimates IS 'Default % of effort per task group that pre-fills the estimate of a new project of this type (total 100)';
COMMENT ON TABLE project_type_task_templates IS 'Task template of a project type: tasks created automatically when a project of this type is created';
COMMENT ON COLUMN project_type_task_templates.task_type_id IS 'must belong to the selected task group';
COMMENT ON COLUMN project_type_task_templates.task_title IS 'title of the task created on the project';
COMMENT ON TABLE projects IS 'Projects';
COMMENT ON COLUMN projects.project_division_id IS 'Web or Software';
COMMENT ON COLUMN projects.project_type_id IS 'tasks are created from this project type''s task template';
COMMENT ON COLUMN projects.is_retainer_project IS 'true = retainer (ongoing support billed periodically); false = normal fixed-scope project';
COMMENT ON COLUMN projects.owner_id IS 'project owner (a person)';
COMMENT ON COLUMN projects.estimated_hours IS 'total estimated hours (optional – may be unknown at first); hours per task group = total × effort %';
COMMENT ON COLUMN projects.estimated_amount IS 'total estimate amount (project value)';
COMMENT ON COLUMN projects.estimated_amount_currency IS 'ISO currency of the estimate amount';
COMMENT ON COLUMN projects.status IS 'values from the old Parameter table (confirm list)';
COMMENT ON COLUMN projects.stage IS 'values from the old Parameter table (confirm list)';
COMMENT ON COLUMN projects.stage_date IS 'set automatically to the review date when a review changes the stage';
COMMENT ON COLUMN projects.is_synced IS 'old IsSync (invoice / external sync)';
COMMENT ON COLUMN projects.transfer_to_sales_pro IS 'Swan: push project to SalesPro';
COMMENT ON COLUMN projects.allocation_locked_at IS 'set when the task-type allocation is approved';
COMMENT ON TABLE project_commercials IS 'Project payment / commercials per year (Commercial tab)';
COMMENT ON COLUMN project_commercials.year IS 'project year';
COMMENT ON COLUMN project_commercials.bill_by_hours IS 'bill by logged hours instead of a fixed value';
COMMENT ON TABLE project_task_group_estimates IS 'Effort estimate of a project per task group (Estimate tab): % of effort; hours = projects.estimated_hours × % (calculated). Tasks and timesheets may only use task types whose group has a share here';
COMMENT ON COLUMN project_task_group_estimates.effort_percentage IS 'share of the project effort; the rows of a project total 100';
COMMENT ON TABLE project_members IS 'Users of a project: what they can do on it and (optionally) their cost per hour';
COMMENT ON COLUMN project_members.access_level IS 'view = quick view (eye) in the project list only; advanced_view = also the details page; edit = can edit the project';
COMMENT ON COLUMN project_members.cost_per_hour IS 'optional; set only when this member needs a project-specific rate';
COMMENT ON COLUMN project_members.currency IS 'currency of cost_per_hour (defaults to the project estimate currency)';
COMMENT ON TABLE project_reviews IS 'Project reviews (Update tab): stage, review date and comment. Completion per task group is in project_review_task_groups; the latest review is the current state';
COMMENT ON COLUMN project_reviews.stage IS 'stage of the project at this review';
COMMENT ON COLUMN project_reviews.review_date IS 'date of the review (defaults to today)';
COMMENT ON TABLE project_review_task_groups IS '% completed per task group at a review. Overall progress = Σ(effort % of the group × completed %) / 100, using project_task_group_estimates';
COMMENT ON COLUMN project_review_task_groups.task_group_id IS 'a task group of the project estimate';
COMMENT ON COLUMN project_review_task_groups.completion_percentage IS '% of the task group completed at this review';
COMMENT ON TABLE tasks IS 'Project tasks and field-service tasks; parent-child via parent_task_id';
COMMENT ON COLUMN tasks.parent_task_id IS 'null = top-level task; load a tree with a recursive CTE';
COMMENT ON COLUMN tasks.level IS '0 = top level, 1 = child, …';
COMMENT ON COLUMN tasks.task_type_id IS 'its task group must have a share in the project estimate (checked by the API)';
COMMENT ON COLUMN tasks.scope_of_work IS 'field tasks';
COMMENT ON COLUMN tasks.priority IS 'values from the old Parameter table (confirm list)';
COMMENT ON COLUMN tasks.status IS 'values from the old Parameter table (confirm list)';
COMMENT ON COLUMN tasks.client_contact IS 'old SwanContact';
COMMENT ON TABLE task_watchers IS 'Users linked to a task with a role (watcher, approver…)';
COMMENT ON TABLE task_teams IS 'Teams linked to a task';
COMMENT ON TABLE task_checklist_items IS 'Checklist items of a task';
COMMENT ON TABLE weekly_plans IS 'Weekly effort plan of a user';
COMMENT ON COLUMN weekly_plans.week_start IS 'Monday of the week';
COMMENT ON COLUMN weekly_plans.working_days IS 'old NoOfDays';
COMMENT ON COLUMN weekly_plans.capacity_minutes IS 'working_days × shift length; for over-planning warnings';
COMMENT ON TABLE weekly_plan_entries IS 'One row per project + task type in a weekly plan';
COMMENT ON COLUMN weekly_plan_entries.task_type_id IS 'its task group must have a share in the project estimate (checked by the API)';
COMMENT ON TABLE daily_plans IS 'Daily work plan of a user';
COMMENT ON COLUMN daily_plans.day_note IS 'end-of-day summary / blockers';
COMMENT ON TABLE daily_plan_items IS 'Items in a day''s plan (an existing task or a free-text item)';
COMMENT ON COLUMN daily_plan_items.task_id IS 'optional';
COMMENT ON COLUMN daily_plan_items.title IS 'required when task_id is null';
COMMENT ON COLUMN daily_plan_items.task_type_id IS 'its task group must have a share in the project estimate (checked by the API)';
COMMENT ON COLUMN daily_plan_items.carried_from IS 'earlier plan_date this item came from';
COMMENT ON TABLE timesheets IS 'Time logged by users';
COMMENT ON COLUMN timesheets.task_type_id IS 'its task group must have a share in the project estimate (checked by the API)';
COMMENT ON COLUMN timesheets.daily_plan_item_id IS 'set when logged from the daily planner';
COMMENT ON COLUMN timesheets.minutes IS 'old TimeSpent: confirm unit';
COMMENT ON TABLE attendance IS 'Daily attendance with check-in / check-out';
COMMENT ON COLUMN attendance.status IS 'present / absent / half_day / late (confirm list)';
COMMENT ON COLUMN attendance.marked_by IS 'group attendance';
COMMENT ON TABLE rosters IS 'Shift roster per user per day';
COMMENT ON TABLE biometric_logs IS 'Punches imported from the biometric device sheet';
COMMENT ON COLUMN biometric_logs.user_id IS 'matched at upload time';
COMMENT ON TABLE mood_logs IS 'Daily mood captured at login';
COMMENT ON TABLE review_periods IS 'Review periods';
COMMENT ON TABLE review_templates IS 'Review templates';
COMMENT ON TABLE review_template_kras IS 'KRAs of a review template';
COMMENT ON TABLE review_template_kpis IS 'KPIs under a template KRA';
COMMENT ON TABLE employee_reviews IS 'Employee performance review for a period';
COMMENT ON COLUMN employee_reviews.stage IS 'values from the old Parameter table (confirm list)';
COMMENT ON TABLE employee_review_kras IS 'KRAs in an employee review with employee and manager ratings';
COMMENT ON TABLE employee_review_kpis IS 'KPIs under an employee-review KRA';
COMMENT ON TABLE ratings IS 'Monthly rating (older screen; confirm still used)';
COMMENT ON COLUMN ratings.rating_month IS 'first day of the month';
COMMENT ON TABLE points IS 'Points (older screen; confirm still used)';
COMMENT ON TABLE review_assignments IS 'Who reviews whom each month (older screen; confirm still used)';
COMMENT ON COLUMN review_assignments.review_month IS 'first day of the month';
COMMENT ON TABLE installation_requests IS 'Installation requests (Swan); IR data can be pulled from SalesPro';
COMMENT ON COLUMN installation_requests.sales_pro_ir_id IS 'SalesPro IR id (old IRSPId)';
COMMENT ON COLUMN installation_requests.email_copy_to IS 'was a comma-separated string';
COMMENT ON TABLE installation_request_documents IS 'Documents attached to an installation request';
COMMENT ON TABLE assets IS 'Assets installed under an installation request, with warranty';
COMMENT ON TABLE upload_types IS 'Excel import definitions (customer locations, task locations…)';
COMMENT ON TABLE upload_type_columns IS 'Column mapping and validation for an upload type';
COMMENT ON COLUMN upload_type_columns.source_header IS 'Excel column header';
COMMENT ON COLUMN upload_type_columns.target_field IS 'column in the target table';
COMMENT ON TABLE uploads IS 'Uploaded files and their processing status (data upload, biometric, roster)';
COMMENT ON COLUMN uploads.upload_type_id IS 'null for biometric / roster uploads';
COMMENT ON TABLE upload_errors IS 'Row-level errors of an upload';
COMMENT ON TABLE audit_logs IS 'Audit trail of changes (reviews, templates, roles, plans…)';
COMMENT ON COLUMN audit_logs.entity IS 'table name, e.g. employee_reviews';
COMMENT ON COLUMN audit_logs.changes IS 'old / new values';
COMMENT ON TABLE error_logs IS 'Application errors (prefer an external logging tool)';
COMMENT ON TABLE messages IS 'UI message texts editable by admins (optional)';


