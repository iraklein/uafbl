-- Check RLS status on all tables
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled 
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('rosters', 'draft_results', 'players', 'managers', 'seasons', 'trades', 'toppers', 'lsl', 'manager_assets')
ORDER BY tablename;

-- Check existing policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;