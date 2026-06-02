-- Manual verification script for public.users (run in SQL Editor or psql)
-- Requires migration: 20260529120000_create_users_table.sql

-- 1) Insert sample user (UUID auto-generated)
insert into public.users (email)
values ('athletyx.mcp.test@example.com')
returning user_id, email, created_at, updated_at;

-- 2) Allowed update (email only; updated_at should advance)
update public.users
set email = 'athletyx.mcp.test.updated@example.com'
where email = 'athletyx.mcp.test@example.com'
returning user_id, email, updated_at;

-- 3) Immutability test (must ERROR: user_id is immutable...)
-- update public.users
-- set user_id = gen_random_uuid()
-- where email = 'athletyx.mcp.test.updated@example.com';

-- 4) Cleanup
-- delete from public.users where email = 'athletyx.mcp.test.updated@example.com';
