-- Free-text notes for a task, shown in the task detail panel.
alter table public.tasks
  add column if not exists notes text;
