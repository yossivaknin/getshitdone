-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  avatar_url text,
  updated_at timestamptz
);

alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- WORKSPACES
create table workspaces (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now(),
  name text not null,
  owner_id uuid references profiles(id) not null
);

alter table workspaces enable row level security;

create policy "Users can view workspaces they own."
  on workspaces for select
  using ( auth.uid() = owner_id );

create policy "Users can insert workspaces."
  on workspaces for insert
  with check ( auth.uid() = owner_id );

-- LISTS
create table lists (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now(),
  title text not null,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  position integer default 0
);

alter table lists enable row level security;

create policy "Users can view lists in their workspaces."
  on lists for select
  using (
    exists (
      select 1 from workspaces
      where workspaces.id = lists.workspace_id
      and workspaces.owner_id = auth.uid()
    )
  );

create policy "Users can insert lists in their workspaces."
  on lists for insert
  with check (
    exists (
      select 1 from workspaces
      where workspaces.id = lists.workspace_id
      and workspaces.owner_id = auth.uid()
    )
  );

-- TASKS
create table tasks (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now(),
  title text not null,
  description text,
  status text default 'todo', -- 'todo', 'in_progress', 'done'
  list_id uuid references lists(id) on delete cascade,
  due_date timestamptz,
  duration_minutes integer,
  google_event_ids jsonb, -- Array of event IDs
  position integer default 0,
  user_id uuid references auth.users(id) -- Optional direct link for simplicity
);

alter table tasks enable row level security;

create policy "Users can view their own tasks."
  on tasks for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own tasks."
  on tasks for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own tasks."
  on tasks for update
  using ( auth.uid() = user_id );

-- TAGS
create table tags (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now(),
  name text not null,
  color text,
  task_id uuid references tasks(id) on delete cascade
);

alter table tags enable row level security;

create policy "Users can view tags on their tasks."
  on tags for select
  using (
    exists (
      select 1 from tasks
      where tasks.id = tags.task_id
      and tasks.user_id = auth.uid()
    )
  );

-- TRIGGER FOR NEW USER
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
