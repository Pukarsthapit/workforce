begin;

create schema if not exists app_private;

create type public.person_state as enum (
  'candidate', 'preboard', 'active', 'suspended', 'onleave', 'leaver', 'archived'
);
create type public.employee_category as enum ('Contracted', 'Bank', 'Agency', 'Salaried');
create type public.employee_entry_mode as enum ('form', 'grid', 'clock');
create type public.employee_pay_basis as enum ('hour', 'day');
create type public.timesheet_state as enum ('draft', 'pend', 'back', 'resub', 'ok');
create type public.timesheet_capture_source as enum ('self', 'proxy', 'clock');
create type public.clock_event_kind as enum ('in', 'breakStart', 'breakEnd', 'out');

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null check (length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_memberships (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_type text not null check (user_type in ('employee', 'manager', 'admin')),
  capabilities text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);
create index tenant_memberships_user_idx on public.tenant_memberships(user_id, active);

create table public.tenant_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  version integer not null default 0 check (version >= 0),
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  updated_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  area text not null default '',
  department text not null default '',
  cost_centre text not null default '',
  level text not null default '',
  minimum_per_shift integer not null default 0 check (minimum_per_shift >= 0),
  address text not null default '',
  active boolean not null default true,
  version integer not null default 0 check (version >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, code)
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  version integer not null default 0 check (version >= 0),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, code)
);

create table public.cost_centres (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  version integer not null default 0 check (version >= 0),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, code)
);

create table public.job_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  night_eligible boolean not null default false,
  version integer not null default 0 check (version >= 0),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, code)
);

create table public.employee_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  category public.employee_category not null,
  entry_mode public.employee_entry_mode not null,
  pay_basis public.employee_pay_basis not null,
  capabilities text[] not null default '{}',
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  version integer not null default 0 check (version >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, code)
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  email text not null default '',
  phone text not null default '',
  employee_type_id uuid,
  category public.employee_category not null,
  location_id uuid,
  department_id uuid,
  job_profile_id uuid,
  manager_id uuid,
  state public.person_state not null,
  contracted_hours numeric(7,2) not null default 0 check (contracted_hours >= 0),
  max_hours numeric(7,2) not null default 0 check (max_hours >= 0),
  start_date date,
  end_date date,
  night_eligible boolean not null default false,
  resource_code text not null default '',
  cis boolean not null default false,
  version integer not null default 0 check (version >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, code),
  foreign key (tenant_id, employee_type_id) references public.employee_types(tenant_id, id) on delete restrict,
  foreign key (tenant_id, location_id) references public.locations(tenant_id, id) on delete restrict,
  foreign key (tenant_id, department_id) references public.departments(tenant_id, id) on delete restrict,
  foreign key (tenant_id, job_profile_id) references public.job_profiles(tenant_id, id) on delete restrict,
  foreign key (tenant_id, manager_id) references public.people(tenant_id, id) on delete restrict
);
create index people_tenant_state_idx on public.people(tenant_id, state);
create index people_tenant_location_state_idx on public.people(tenant_id, location_id, state);
create index people_tenant_manager_idx on public.people(tenant_id, manager_id);
create unique index people_tenant_email_ci_idx on public.people(tenant_id, lower(email)) where email <> '';

create table public.person_accounts (
  tenant_id uuid not null,
  person_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, person_id),
  unique (tenant_id, user_id),
  foreign key (tenant_id, person_id) references public.people(tenant_id, id) on delete cascade,
  foreign key (tenant_id, user_id) references public.tenant_memberships(tenant_id, user_id) on delete cascade
);

create table public.person_private_data (
  tenant_id uuid not null,
  person_id uuid not null,
  ciphertext bytea not null,
  nonce bytea not null,
  key_version text not null,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, person_id),
  foreign key (tenant_id, person_id) references public.people(tenant_id, id) on delete cascade
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  client text not null default '',
  cost_centre_id uuid,
  manager_id uuid,
  status text not null default 'open',
  starts_on date,
  ends_on date,
  budget_hours numeric(10,2),
  billable boolean not null default false,
  location_id uuid,
  version integer not null default 0 check (version >= 0),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, code),
  foreign key (tenant_id, cost_centre_id) references public.cost_centres(tenant_id, id) on delete restrict,
  foreign key (tenant_id, manager_id) references public.people(tenant_id, id) on delete restrict,
  foreign key (tenant_id, location_id) references public.locations(tenant_id, id) on delete restrict,
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create index projects_tenant_status_idx on public.projects(tenant_id, status);

create table public.timesheet_configs (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  version integer not null default 0 check (version >= 0),
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  updated_at timestamptz not null default now()
);

create table public.timesheet_days (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  person_id uuid not null,
  work_date date not null,
  state public.timesheet_state not null default 'draft',
  work_type text not null default '',
  selected_shift_code text not null default '',
  non_working_reason text not null default '',
  capture_source public.timesheet_capture_source not null default 'self',
  entered_by uuid,
  submitted_at timestamptz,
  return_reason text not null default '',
  worked_anyway boolean not null default false,
  version integer not null default 0 check (version >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, person_id, work_date),
  foreign key (tenant_id, person_id) references public.people(tenant_id, id) on delete restrict,
  foreign key (tenant_id, entered_by) references public.people(tenant_id, id) on delete restrict
);
create index timesheet_days_queue_idx on public.timesheet_days(tenant_id, state, work_date desc);
create index timesheet_days_person_history_idx on public.timesheet_days(tenant_id, person_id, work_date desc);

create table public.timesheet_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  day_id uuid not null,
  line_number smallint not null check (line_number between 1 and 6),
  start_time time,
  finish_time time,
  hours numeric(5,2) check (hours is null or hours between 0 and 24),
  fields jsonb not null default '{}'::jsonb check (jsonb_typeof(fields) = 'object'),
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, day_id, line_number),
  foreign key (tenant_id, day_id) references public.timesheet_days(tenant_id, id) on delete cascade,
  check ((start_time is null) = (finish_time is null))
);

create table public.timesheet_breaks (
  tenant_id uuid not null,
  entry_id uuid not null,
  break_number smallint not null check (break_number between 1 and 5),
  starts_at time not null,
  ends_at time not null,
  primary key (tenant_id, entry_id, break_number),
  foreign key (tenant_id, entry_id) references public.timesheet_entries(tenant_id, id) on delete cascade
);

create table public.timesheet_allowances (
  tenant_id uuid not null,
  day_id uuid not null,
  allowance_code text not null,
  primary key (tenant_id, day_id, allowance_code),
  foreign key (tenant_id, day_id) references public.timesheet_days(tenant_id, id) on delete cascade
);

create table public.timesheet_state_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  day_id uuid not null,
  from_state public.timesheet_state,
  to_state public.timesheet_state not null,
  actor_person_id uuid,
  reason text not null default '',
  changed_at timestamptz not null default now(),
  foreign key (tenant_id, day_id) references public.timesheet_days(tenant_id, id) on delete cascade,
  foreign key (tenant_id, actor_person_id) references public.people(tenant_id, id) on delete restrict
);
create index timesheet_history_day_idx on public.timesheet_state_history(tenant_id, day_id, changed_at desc);

create table public.clock_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  person_id uuid not null,
  work_date date not null,
  closed_late_at timestamptz,
  late boolean not null default false,
  version integer not null default 0 check (version >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, person_id, work_date),
  foreign key (tenant_id, person_id) references public.people(tenant_id, id) on delete restrict
);

create table public.clock_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  clock_record_id uuid not null,
  sequence integer not null check (sequence > 0),
  kind public.clock_event_kind not null,
  occurred_at timestamptz not null,
  unique (tenant_id, id),
  unique (tenant_id, clock_record_id, sequence),
  foreign key (tenant_id, clock_record_id) references public.clock_records(tenant_id, id) on delete cascade
);
create index clock_events_order_idx on public.clock_events(tenant_id, clock_record_id, occurred_at);

create table public.audit_events (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  actor_user_id uuid,
  actor_person_id uuid,
  viewed_as_person_id uuid,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before_data jsonb,
  after_data jsonb,
  reason text,
  occurred_at timestamptz not null default now(),
  foreign key (tenant_id, actor_user_id) references public.tenant_memberships(tenant_id, user_id) on delete restrict,
  foreign key (tenant_id, actor_person_id) references public.people(tenant_id, id) on delete restrict,
  foreign key (tenant_id, viewed_as_person_id) references public.people(tenant_id, id) on delete restrict
);
create index audit_events_tenant_time_idx on public.audit_events(tenant_id, occurred_at desc);
create index audit_events_actor_time_idx on public.audit_events(tenant_id, actor_person_id, occurred_at desc);
create index audit_events_entity_idx on public.audit_events(tenant_id, entity_type, entity_id);

create or replace function public.resolve_workforce_login(
  p_user_id uuid,
  p_email text,
  p_super_admin_email text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_tenant_id uuid;
  v_person_id uuid;
  v_person public.people%rowtype;
  v_membership public.tenant_memberships%rowtype;
  v_person_ids uuid[];
  v_tenant_ids uuid[];
  v_super_admin boolean := lower(p_email) = lower(p_super_admin_email);
  v_code text;
begin
  if p_user_id is null or p_email is null or p_email = '' then
    raise exception using errcode = 'P0001', message = 'invalid-identity';
  end if;

  if v_super_admin then
    perform pg_advisory_xact_lock(hashtextextended('workforce-bootstrap-admin', 0));
    select id into v_tenant_id from public.tenants order by created_at, id limit 1;
    if v_tenant_id is null then
      insert into public.tenants (slug, name)
      values ('workforce-' || left(replace(p_user_id::text, '-', ''), 12), 'Workforce')
      returning id into v_tenant_id;
    end if;

    select person_id into v_person_id
    from public.person_accounts
    where tenant_id = v_tenant_id and user_id = p_user_id;
    if v_person_id is null then
      v_code := 'SYS-' || upper(left(replace(p_user_id::text, '-', ''), 8));
      insert into public.people (
        tenant_id, code, name, email, category, state, start_date
      ) values (
        v_tenant_id, v_code, 'Super Admin', '', 'Salaried', 'active', current_date
      ) returning id into v_person_id;
    end if;

    insert into public.tenant_memberships (tenant_id, user_id, user_type, active, capabilities)
    values (
      v_tenant_id, p_user_id, 'admin', true,
      array['notice_post','rota_pattern','own_onb','onb_track','onb_verify','onb_cfg','emp_crud',
        'rota_shift','master_data','type_cfg','mod_cfg','framework','notice_org','perm_cfg',
        'integration','bank_verify']::text[]
    )
    on conflict (tenant_id, user_id) do update
      set user_type = 'admin', active = true, capabilities = excluded.capabilities;
  else
    select array_agg(pa.person_id), array_agg(pa.tenant_id)
      into v_person_ids, v_tenant_ids
    from public.person_accounts pa
    join public.tenant_memberships tm
      on tm.tenant_id = pa.tenant_id and tm.user_id = pa.user_id and tm.active
    where pa.user_id = p_user_id;
    if coalesce(cardinality(v_person_ids), 0) > 1 then
      raise exception using errcode = 'P0001', message = 'employee-not-found-or-ambiguous';
    end if;
    v_person_id := v_person_ids[1];
    v_tenant_id := v_tenant_ids[1];

    if v_person_id is null then
      select array_agg(id), array_agg(tenant_id)
        into v_person_ids, v_tenant_ids
      from public.people
      where lower(email) = lower(p_email)
        and state in ('candidate', 'preboard', 'active', 'onleave');
      if coalesce(cardinality(v_person_ids), 0) <> 1 then
        raise exception using errcode = 'P0001', message = 'employee-not-found-or-ambiguous';
      end if;
      v_person_id := v_person_ids[1];
      v_tenant_id := v_tenant_ids[1];
      insert into public.tenant_memberships (tenant_id, user_id, user_type, active, capabilities)
      values (
        v_tenant_id, p_user_id, 'employee', true,
        array['own_home','own_notices','own_ts','own_shifts','own_leave','own_hours','claim','own_onb']::text[]
      )
      on conflict (tenant_id, user_id) do nothing;
    end if;

    if v_tenant_id is null or v_person_id is null then
      raise exception using errcode = 'P0001', message = 'employee-not-found-or-ambiguous';
    end if;

    select * into v_membership
    from public.tenant_memberships
    where tenant_id = v_tenant_id and user_id = p_user_id;
    if not found or not v_membership.active then
      raise exception using errcode = 'P0001', message = 'account-disabled';
    end if;
  end if;

  if exists (
    select 1 from public.person_accounts
    where tenant_id = v_tenant_id and user_id = p_user_id and person_id <> v_person_id
  ) or exists (
    select 1 from public.person_accounts
    where tenant_id = v_tenant_id and person_id = v_person_id and user_id <> p_user_id
  ) then
      raise exception using errcode = 'P0001', message = 'employee-account-already-linked';
  end if;
  insert into public.person_accounts (tenant_id, person_id, user_id)
  values (v_tenant_id, v_person_id, p_user_id)
  on conflict (tenant_id, person_id) do nothing;
  if not exists (
    select 1 from public.person_accounts
    where tenant_id = v_tenant_id and person_id = v_person_id and user_id = p_user_id
  ) then
    raise exception using errcode = 'P0001', message = 'employee-account-already-linked';
  end if;

  select * into v_person from public.people
  where tenant_id = v_tenant_id and id = v_person_id;
  select * into v_membership from public.tenant_memberships
  where tenant_id = v_tenant_id and user_id = p_user_id;

  if v_person.id is null or not v_membership.active then
    raise exception using errcode = 'P0001', message = 'account-disabled';
  end if;
  if not v_super_admin and v_person.state not in ('candidate', 'preboard', 'active', 'onleave') then
    raise exception using errcode = 'P0001', message = 'account-disabled';
  end if;

  return jsonb_build_object(
    'tenant_id', v_tenant_id,
    'person_id', v_person.id,
    'person_code', v_person.code,
    'name', v_person.name,
    'user_type', v_membership.user_type,
    'capabilities', v_membership.capabilities,
    'state', v_person.state,
    'location_name', coalesce((
      select l.name from public.locations l
      where l.tenant_id = v_tenant_id and l.id = v_person.location_id
    ), '')
  );
end;
$$;
revoke all on function public.resolve_workforce_login(uuid, text, text) from public, anon, authenticated;
grant execute on function public.resolve_workforce_login(uuid, text, text) to service_role;

create or replace function app_private.is_tenant_member(target_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1
    from public.tenant_memberships m
    where m.tenant_id = target_tenant
      and m.user_id = auth.uid()
      and m.active
  );
$$;
revoke all on function app_private.is_tenant_member(uuid) from public, anon;
grant usage on schema app_private to authenticated, service_role;
grant execute on function app_private.is_tenant_member(uuid) to authenticated, service_role;

alter table public.tenants enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.tenant_settings enable row level security;
alter table public.locations enable row level security;
alter table public.departments enable row level security;
alter table public.cost_centres enable row level security;
alter table public.job_profiles enable row level security;
alter table public.employee_types enable row level security;
alter table public.people enable row level security;
alter table public.person_accounts enable row level security;
alter table public.person_private_data enable row level security;
alter table public.projects enable row level security;
alter table public.timesheet_configs enable row level security;
alter table public.timesheet_days enable row level security;
alter table public.timesheet_entries enable row level security;
alter table public.timesheet_breaks enable row level security;
alter table public.timesheet_allowances enable row level security;
alter table public.timesheet_state_history enable row level security;
alter table public.clock_records enable row level security;
alter table public.clock_events enable row level security;
alter table public.audit_events enable row level security;

create policy tenant_member_reads_tenant on public.tenants
  for select to authenticated using (app_private.is_tenant_member(id));
create policy member_reads_own_membership on public.tenant_memberships
  for select to authenticated using (user_id = auth.uid());

create policy tenant_member_reads_settings on public.tenant_settings
  for select to authenticated using (app_private.is_tenant_member(tenant_id));
create policy tenant_member_reads_locations on public.locations
  for select to authenticated using (app_private.is_tenant_member(tenant_id));
create policy tenant_member_reads_departments on public.departments
  for select to authenticated using (app_private.is_tenant_member(tenant_id));
create policy tenant_member_reads_cost_centres on public.cost_centres
  for select to authenticated using (app_private.is_tenant_member(tenant_id));
create policy tenant_member_reads_job_profiles on public.job_profiles
  for select to authenticated using (app_private.is_tenant_member(tenant_id));
create policy tenant_member_reads_employee_types on public.employee_types
  for select to authenticated using (app_private.is_tenant_member(tenant_id));
create policy tenant_member_reads_people on public.people
  for select to authenticated using (app_private.is_tenant_member(tenant_id));
create policy tenant_member_reads_person_accounts on public.person_accounts
  for select to authenticated using (app_private.is_tenant_member(tenant_id));
create policy tenant_member_reads_projects on public.projects
  for select to authenticated using (app_private.is_tenant_member(tenant_id));
create policy tenant_member_reads_timesheet_configs on public.timesheet_configs
  for select to authenticated using (app_private.is_tenant_member(tenant_id));
create policy tenant_member_reads_timesheet_days on public.timesheet_days
  for select to authenticated using (app_private.is_tenant_member(tenant_id));
create policy tenant_member_reads_timesheet_entries on public.timesheet_entries
  for select to authenticated using (app_private.is_tenant_member(tenant_id));
create policy tenant_member_reads_timesheet_breaks on public.timesheet_breaks
  for select to authenticated using (app_private.is_tenant_member(tenant_id));
create policy tenant_member_reads_timesheet_allowances on public.timesheet_allowances
  for select to authenticated using (app_private.is_tenant_member(tenant_id));
create policy tenant_member_reads_timesheet_history on public.timesheet_state_history
  for select to authenticated using (app_private.is_tenant_member(tenant_id));
create policy tenant_member_reads_clock_records on public.clock_records
  for select to authenticated using (app_private.is_tenant_member(tenant_id));
create policy tenant_member_reads_clock_events on public.clock_events
  for select to authenticated using (app_private.is_tenant_member(tenant_id));
create policy tenant_member_reads_audit_events on public.audit_events
  for select to authenticated using (app_private.is_tenant_member(tenant_id));

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

commit;
