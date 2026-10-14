-- Business AI Core
-- Business ownership foundation
-- DRAFT: review before execution.

create table if not exists public.ai_businesses (
    id uuid primary key default gen_random_uuid(),
    business_key text not null unique,
    business_name text not null,
    created_at timestamptz not null default now()
);

create table if not exists public.ai_business_members (
    business_id uuid not null
        references public.ai_businesses(id)
        on delete cascade,

    user_id uuid not null
        references auth.users(id),

    business_role text not null
        check (
            business_role in (
                'OWNER',
                'ADMIN',
                'EDITOR',
                'VIEWER'
            )
        ),

    created_at timestamptz not null default now(),

    primary key (business_id, user_id)
);

create index if not exists ai_business_members_user_idx
on public.ai_business_members (user_id);

alter table public.ai_businesses
enable row level security;

alter table public.ai_business_members
enable row level security;

-- No direct client access policies.
-- Server authorization must verify business membership.
-- Do not execute until the migration and ownership
-- initialization process have been reviewed.
