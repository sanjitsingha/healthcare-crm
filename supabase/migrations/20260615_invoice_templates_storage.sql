-- Public bucket holding rasterized letterhead backgrounds for invoice templates
insert into storage.buckets (id, name, public)
values ('invoice-templates', 'invoice-templates', true)
on conflict (id) do update set public = true;

-- Permissive policies scoped to this bucket (mirrors the app's USING(true) convention)
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='invoice_templates_read') then
    create policy invoice_templates_read on storage.objects for select using (bucket_id = 'invoice-templates');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='invoice_templates_insert') then
    create policy invoice_templates_insert on storage.objects for insert with check (bucket_id = 'invoice-templates');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='invoice_templates_update') then
    create policy invoice_templates_update on storage.objects for update using (bucket_id = 'invoice-templates') with check (bucket_id = 'invoice-templates');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='invoice_templates_delete') then
    create policy invoice_templates_delete on storage.objects for delete using (bucket_id = 'invoice-templates');
  end if;
end $$;
