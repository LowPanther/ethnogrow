-- ============================================================
-- ethnogrow — Supabase Schema
-- Run this in your Supabase SQL editor to set up the database
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Researcher Profiles ──────────────────────────────────────────────────────
-- Extends the built-in auth.users table

create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  organisation text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Projects ─────────────────────────────────────────────────────────────────

create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  researcher_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'closed', 'archived')),
  questions jsonb not null default '[]'::jsonb,
  participant_token text unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.projects enable row level security;

create policy "Researchers can view own projects"
  on public.projects for select
  using (auth.uid() = researcher_id);

create policy "Researchers can insert own projects"
  on public.projects for insert
  with check (auth.uid() = researcher_id);

create policy "Researchers can update own projects"
  on public.projects for update
  using (auth.uid() = researcher_id);

create policy "Researchers can delete own projects"
  on public.projects for delete
  using (auth.uid() = researcher_id);

-- Public read for participant view (via token, no auth required)
create policy "Anyone can view active project by token"
  on public.projects for select
  using (status = 'active');

-- ─── Responses ────────────────────────────────────────────────────────────────

create table public.responses (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  session_id text not null,
  responses jsonb not null default '[]'::jsonb,
  submitted_at timestamptz default now() not null
);

alter table public.responses enable row level security;

-- Anyone can submit a response (participants don't log in)
create policy "Anyone can submit responses"
  on public.responses for insert
  with check (true);

-- Researchers can view responses for their projects
create policy "Researchers can view responses for own projects"
  on public.responses for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = responses.project_id
      and projects.researcher_id = auth.uid()
    )
  );

-- ─── AI Reports ───────────────────────────────────────────────────────────────

create table public.ai_reports (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  summary text not null,
  themes jsonb not null default '[]'::jsonb,
  key_findings jsonb not null default '[]'::jsonb,
  response_count integer not null default 0,
  generated_at timestamptz default now() not null
);

alter table public.ai_reports enable row level security;

create policy "Researchers can view reports for own projects"
  on public.ai_reports for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = ai_reports.project_id
      and projects.researcher_id = auth.uid()
    )
  );

-- Service role can insert reports (via API route)
create policy "Service role can insert reports"
  on public.ai_reports for insert
  with check (true);

-- ─── Utility: updated_at trigger ─────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_projects_updated_at
  before update on public.projects
  for each row execute procedure public.set_updated_at();

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
