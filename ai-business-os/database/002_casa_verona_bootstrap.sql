-- Business AI Core
-- Initial Casa Verona business registration
-- TEMPLATE ONLY - DO NOT EXECUTE AS IS.
--
-- Before execution:
-- 1. Verify the intended owner's auth.users.id.
-- 2. Replace the placeholder UUID below.
-- 3. Review the business ownership decision.
-- 4. Execute only through an authorized admin session.

begin;

insert into public.ai_businesses (
    business_key,
    business_name
)
values (
    'casa_verona',
    'Casa Verona'
)
on conflict (business_key)
do nothing;

insert into public.ai_business_members (
    business_id,
    user_id,
    business_role
)
select
    b.id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'OWNER'
from public.ai_businesses b
where b.business_key = 'casa_verona'
on conflict (business_id, user_id)
do nothing;

commit;
