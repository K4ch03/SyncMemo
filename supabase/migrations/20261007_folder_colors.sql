-- Apply after 20261007_folders.sql; existing notes and folders are preserved.
alter table public.folders add column if not exists color text
 check (color is null or color ~ '^#[0-9a-fA-F]{6}$');
notify pgrst, 'reload schema';
