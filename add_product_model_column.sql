-- Adiciona o campo Modelo aos produtos.
-- Execute no SQL Editor do Supabase antes de salvar produtos com modelo.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS model TEXT;

COMMENT ON COLUMN public.products.model IS 'Modelo do produto exibido no cadastro, detalhes e carrinho.';
