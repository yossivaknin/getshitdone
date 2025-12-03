-- Additional RLS policies and schema updates for full user separation

-- Add delete policies for tasks
create policy "Users can delete their own tasks."
  on tasks for delete
  using ( auth.uid() = user_id );

-- Add update and delete policies for lists
create policy "Users can update lists in their workspaces."
  on lists for update
  using (
    exists (
      select 1 from workspaces
      where workspaces.id = lists.workspace_id
      and workspaces.owner_id = auth.uid()
    )
  );

create policy "Users can delete lists in their workspaces."
  on lists for delete
  using (
    exists (
      select 1 from workspaces
      where workspaces.id = lists.workspace_id
      and workspaces.owner_id = auth.uid()
    )
  );

-- Add update and delete policies for workspaces
create policy "Users can update their own workspaces."
  on workspaces for update
  using ( auth.uid() = owner_id );

create policy "Users can delete their own workspaces."
  on workspaces for delete
  using ( auth.uid() = owner_id );

-- Add insert, update, delete policies for tags
create policy "Users can insert tags on their tasks."
  on tags for insert
  with check (
    exists (
      select 1 from tasks
      where tasks.id = tags.task_id
      and tasks.user_id = auth.uid()
    )
  );

create policy "Users can update tags on their tasks."
  on tags for update
  using (
    exists (
      select 1 from tasks
      where tasks.id = tags.task_id
      and tasks.user_id = auth.uid()
    )
  );

create policy "Users can delete tags on their tasks."
  on tags for delete
  using (
    exists (
      select 1 from tasks
      where tasks.id = tags.task_id
      and tasks.user_id = auth.uid()
    )
  );

-- Ensure user_id is NOT NULL for tasks (critical for user separation)
alter table tasks alter column user_id set not null;

-- Add index for better query performance
create index if not exists tasks_user_id_idx on tasks(user_id);
create index if not exists tasks_status_idx on tasks(status);
create index if not exists tasks_list_id_idx on tasks(list_id);

