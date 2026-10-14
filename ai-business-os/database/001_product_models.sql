-- Casa Verona OS
-- AI Product Development Library
-- Migration 001
-- Do not execute before reviewing permissions.

create table if not exists public.ai_product_models (
    id uuid primary key default gen_random_uuid(),

    business_id uuid not null
        references public.ai_businesses(id),

    created_by uuid not null
        references auth.users(id),

    category text not null,
    model_name text,
    concept_data jsonb not null default '{}'::jsonb,

    development_status text not null
        default 'CONCEPT_CREATED',

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint ai_product_models_status_check
    check (
        development_status in (
            'CONCEPT_CREATED',
            'AWAITING_RENDER',
            'RENDER_READY',
            'AWAITING_OWNER_APPROVAL',
            'APPROVED_FOR_FACTORY_REVIEW',
            'FACTORY_APPROVED',
            'APPROVED_FOR_MARKETING',
            'REJECTED'
        )
    )
);

create index if not exists ai_product_models_business_idx
on public.ai_product_models (business_id, created_at desc);

create index if not exists ai_product_models_creator_idx
on public.ai_product_models (created_by);

alter table public.ai_product_models
enable row level security;

-- No client access policies yet.
-- Server-side access rules will be reviewed separately.
