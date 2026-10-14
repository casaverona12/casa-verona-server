
-- CASA VERONA — SALES BOT MASTER CONTROL V1

CREATE TABLE IF NOT EXISTS public.sales_bot_settings (
    id TEXT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sales_bot_settings
ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.sales_bot_settings
FROM anon, authenticated;

INSERT INTO public.sales_bot_settings (
    id,
    enabled
)
VALUES (
    'main',
    FALSE
)
ON CONFLICT (id) DO NOTHING;
