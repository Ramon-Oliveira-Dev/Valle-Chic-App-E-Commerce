-- Corrige as políticas de Row-Level Security (RLS) para a tabela de parcelas (installments) e outras tabelas de vendas.
-- Execute este arquivo no SQL Editor do seu projeto Supabase para resolver o erro "42501 - new row violates row-level security policy".

-- 1. Desabilitar temporariamente RLS ou criar uma política aberta para a tabela installments
-- para garantir que o administrador consiga criar parcelas, seja autenticado via Supabase Auth ou via login local de contingência.

DROP POLICY IF EXISTS "Authenticated all installments" ON installments;
DROP POLICY IF EXISTS "Allow all on installments" ON installments;

-- Criar política de acesso completo (all) para permitir SELECT, INSERT, UPDATE, DELETE 
-- tanto para usuários autenticados quanto para o fluxo de administração local (que utiliza a chave anônima).
CREATE POLICY "Allow all on installments" 
  ON installments 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- 2. Garantir o mesmo comportamento para sales e sale_items em caso de contingência do administrador
DROP POLICY IF EXISTS "Authenticated all sales" ON sales;
DROP POLICY IF EXISTS "Allow all on sales" ON sales;

CREATE POLICY "Allow all on sales" 
  ON sales 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated all sale_items" ON sale_items;
DROP POLICY IF EXISTS "Allow all on sale_items" ON sale_items;

CREATE POLICY "Allow all on sale_items" 
  ON sale_items 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- 3. Habilitar a tabela de parcelas
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- 4. Conceder permissões explícitas para garantir o funcionamento correto da API rest
GRANT ALL ON installments TO anon, authenticated;
GRANT ALL ON sales TO anon, authenticated;
GRANT ALL ON sale_items TO anon, authenticated;
