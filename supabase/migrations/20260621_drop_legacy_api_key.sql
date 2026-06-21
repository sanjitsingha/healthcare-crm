-- Remove the deprecated single API key (settings.public_api_key).
-- The CRM now uses the multi-key settings.api_keys[] array, and the legacy
-- field is no longer accepted by getOrgByApiKey(). This purges the stale value
-- so an old key can never linger in the database.
--
-- Safe + idempotent: the JSONB `-` operator drops one top-level key; the `?`
-- guard only touches rows that still have it. Run in the Supabase SQL editor.

update organizations
   set settings = settings - 'public_api_key'
 where settings ? 'public_api_key';
