-- Corrige a tabela/políticas usadas pela tela Admin > Finanças > Metas.
-- Execute este arquivo no SQL Editor do Supabase.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.configuracoes_metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mes_ano TEXT NOT NULL,
  faturamento_estimado NUMERIC DEFAULT 0,
  capital_giro_desejado NUMERIC DEFAULT 0,
  percentual_capital_giro NUMERIC DEFAULT 30,
  percentual_lucro NUMERIC DEFAULT 70,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'configuracoes_metas_user_id_mes_ano_key'
      AND conrelid = 'public.configuracoes_metas'::regclass
  ) THEN
    ALTER TABLE public.configuracoes_metas
      ADD CONSTRAINT configuracoes_metas_user_id_mes_ano_key UNIQUE (user_id, mes_ano);
  END IF;
END $$;

ALTER TABLE public.configuracoes_metas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own goals" ON public.configuracoes_metas;
DROP POLICY IF EXISTS "Users can insert own goals" ON public.configuracoes_metas;
DROP POLICY IF EXISTS "Users can update own goals" ON public.configuracoes_metas;
DROP POLICY IF EXISTS "Users can delete own goals" ON public.configuracoes_metas;
DROP POLICY IF EXISTS "Authenticated all configuracoes_metas" ON public.configuracoes_metas;

CREATE POLICY "Users can select own goals"
  ON public.configuracoes_metas
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON public.configuracoes_metas
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON public.configuracoes_metas
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON public.configuracoes_metas
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes_metas TO authenticated;
