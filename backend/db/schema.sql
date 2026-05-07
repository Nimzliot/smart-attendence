create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  full_name text not null,
  email text unique not null,
  role text not null default 'student' check (role in ('admin', 'student')),
  department text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.face_encodings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  encoding jsonb not null,
  image_path text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(student_id)
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'present' check (status in ('present', 'absent', 'late')),
  source text not null default 'face_recognition',
  device_id text,
  marked_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.device_logs (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  status text not null default 'online',
  ip_address text,
  message text,
  last_seen timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    auth_user_id,
    full_name,
    email,
    role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    'student'
  )
  on conflict (auth_user_id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row execute function public.handle_updated_at();

drop trigger if exists trg_face_encodings_updated_at on public.face_encodings;
create trigger trg_face_encodings_updated_at
before update on public.face_encodings
for each row execute function public.handle_updated_at();

drop trigger if exists trg_device_logs_updated_at on public.device_logs;
create trigger trg_device_logs_updated_at
before update on public.device_logs
for each row execute function public.handle_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

create index if not exists idx_users_role on public.users(role);
create index if not exists idx_attendance_student_id on public.attendance(student_id);
create index if not exists idx_attendance_marked_at on public.attendance(marked_at desc);
create index if not exists idx_device_logs_last_seen on public.device_logs(last_seen desc);

alter table public.users enable row level security;
alter table public.face_encodings enable row level security;
alter table public.attendance enable row level security;
alter table public.device_logs enable row level security;

drop policy if exists "Admins manage users" on public.users;
create policy "Admins manage users"
on public.users
for all
to authenticated
using (coalesce((auth.jwt() ->> 'role'), (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin')
with check (coalesce((auth.jwt() ->> 'role'), (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin');

drop policy if exists "Students view self profile" on public.users;
create policy "Students view self profile"
on public.users
for select
to authenticated
using (auth.uid() = auth_user_id);

drop policy if exists "Admins manage attendance" on public.attendance;
create policy "Admins manage attendance"
on public.attendance
for all
to authenticated
using (coalesce((auth.jwt() ->> 'role'), (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin')
with check (coalesce((auth.jwt() ->> 'role'), (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin');

drop policy if exists "Students view own attendance" on public.attendance;
create policy "Students view own attendance"
on public.attendance
for select
to authenticated
using (
  student_id in (
    select id from public.users where auth_user_id = auth.uid()
  )
);

drop policy if exists "Admins manage face encodings" on public.face_encodings;
create policy "Admins manage face encodings"
on public.face_encodings
for all
to authenticated
using (coalesce((auth.jwt() ->> 'role'), (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin')
with check (coalesce((auth.jwt() ->> 'role'), (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin');

drop policy if exists "Admins manage device logs" on public.device_logs;
create policy "Admins manage device logs"
on public.device_logs
for all
to authenticated
using (coalesce((auth.jwt() ->> 'role'), (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin')
with check (coalesce((auth.jwt() ->> 'role'), (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin');

insert into public.users (id, full_name, email, role, department)
values
  ('11111111-1111-1111-1111-111111111111', 'Aarav Sharma', 'aarav@example.com', 'student', 'ECE'),
  ('22222222-2222-2222-2222-222222222222', 'Diya Patel', 'diya@example.com', 'student', 'CSE'),
  ('33333333-3333-3333-3333-333333333333', 'Admin User', 'admin@example.com', 'admin', 'Operations')
on conflict (id) do nothing;

insert into public.device_logs (device_id, status, ip_address, message)
values ('esp32-cam-01', 'online', '192.168.1.77', 'Demo device registered')
on conflict (device_id) do nothing;
