-- Adds a `subtasks` checklist to tasks, stored inline as JSONB.
-- Each element: { "id": uuid, "title": text, "done": boolean }
alter table tasks
  add column if not exists subtasks jsonb not null default '[]'::jsonb;
