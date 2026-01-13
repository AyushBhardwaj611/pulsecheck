-- ✅ 001_init.sql – PulseCheck MVP
-- Enable uuid extension for primary keys
create extension if not exists "uuid-ossp";

-- USERS TABLE
create table public.users (
    id uuid primary key default uuid_generate_v4(),
    email text not null unique,
    created_at timestamptz not null default now()
);

-- MONITORS TABLE
create table public.monitors (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.users(id) on delete cascade,
    name text not null,
    url text not null,
    type text not null check (type in ('http', 'https', 'ping')),
    interval_seconds int not null default 300,
    created_at timestamptz not null default now()
);

create index idx_monitors_user_id on public.monitors(user_id);

-- MONITOR_CHECKS TABLE
create table public.monitor_checks (
    id uuid primary key default uuid_generate_v4(),
    monitor_id uuid not null references public.monitors(id) on delete cascade,
    status text not null check (status in ('up','down')),
    response_time_ms int,
    error_message text,
    checked_at timestamptz not null default now()
);

create index idx_monitor_checks_monitor_id on public.monitor_checks(monitor_id);
create index idx_monitor_checks_checked_at on public.monitor_checks(checked_at);
create index idx_monitor_checks_monitor_time on public.monitor_checks(monitor_id, checked_at desc);

-- HELPER FUNCTION: Get latest status for each monitor
create or replace function public.get_latest_monitor_status(monitor_uuid uuid)
returns table(
    monitor_id uuid,
    status text,
    checked_at timestamptz
)
language sql stable as $$
    select monitor_id, status, checked_at
    from public.monitor_checks
    where monitor_id = monitor_uuid
    order by checked_at desc
    limit 1;
$$;

-- RLS Policies
alter table public.monitors enable row level security;
alter table public.monitor_checks enable row level security;

-- MONITORS: Only owner can select/insert/update/delete
create policy "users_can_manage_own_monitors" on public.monitors
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- MONITOR_CHECKS: Only owner (via monitor) can select/insert/update/delete
create policy "users_can_manage_own_checks" on public.monitor_checks
    for all
    using (exists (
        select 1 from public.monitors m
        where m.id = monitor_checks.monitor_id
        and m.user_id = auth.uid()
    ))
    with check (exists (
        select 1 from public.monitors m
        where m.id = monitor_checks.monitor_id
        and m.user_id = auth.uid()
    ));

-- GRANT Statements
grant select, insert, update, delete on public.monitors to authenticated;
grant select, insert, update, delete on public.monitor_checks to authenticated;
grant select, insert, update, delete on public.users to authenticated;
