-- Per-task activity feed (notes edits, subtask changes, status changes),
-- stored inline as JSONB. Each element: { id, type, content, created_at }.
alter table public.tasks
  add column if not exists activity_log jsonb not null default '[]'::jsonb;
