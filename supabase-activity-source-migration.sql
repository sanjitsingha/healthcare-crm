-- ────────────────────────────────────────────────────────────────────────
-- Activity source_page migration
--
-- Adds `source_page` to the activities table so every timeline entry records
-- which page the action was performed on (Lead / Patient / Consultation).
-- This powers the unified, page-tagged timeline shared across all three pages.
--
-- Safe to run more than once.
-- ────────────────────────────────────────────────────────────────────────

alter table activities
  add column if not exists source_page text;

-- Constrain to the known page sources (drop first so re-runs don't error).
alter table activities drop constraint if exists activities_source_page_check;
alter table activities
  add constraint activities_source_page_check
  check (source_page is null or source_page in
    ('lead', 'patient', 'consultation', 'contact', 'organization'));

-- Backfill existing rows: the page an old activity happened on is best
-- approximated by the entity it was attached to.
update activities
  set source_page = entity_type
  where source_page is null;

-- ── Richer event types ──────────────────────────────────────────────────
-- Widen the activity `type` constraint so structural events (tag changes,
-- and future ones) can be recorded with their own type/icon instead of a
-- generic note. Drop-then-add keeps this re-runnable.
alter table activities drop constraint if exists activities_type_check;
alter table activities
  add constraint activities_type_check
  check (type in (
    'comment', 'email', 'call', 'meeting', 'note',
    'status_change', 'stage_change', 'whatsapp', 'tag'
  ));
