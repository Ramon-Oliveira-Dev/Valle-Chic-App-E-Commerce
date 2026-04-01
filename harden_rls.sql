-- 1. Criar tabela de logs para monitoramento
CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level TEXT NOT NULL, -- 'error', 'warning', 'info'
  message TEXT NOT NULL,
  stack TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Habilitar RLS na tabela de logs
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- 3. Política para permitir que qualquer um insira logs (para capturar erros de clientes não logados)
-- Mas apenas administradores podem ler
CREATE POLICY "Allow anonymous insert logs" ON logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated select logs" ON logs FOR SELECT USING (auth.role() = 'authenticated');

-- 4. Reforçar (Harden) RLS nas tabelas existentes
-- Remover políticas "Allow all" anteriores (assumindo os nomes do script anterior)
DROP POLICY IF EXISTS "Allow all on clients" ON clients;
DROP POLICY IF EXISTS "Allow all on products" ON products;
DROP POLICY IF EXISTS "Allow all on sales" ON sales;
DROP POLICY IF EXISTS "Allow all on sale_items" ON sale_items;
DROP POLICY IF EXISTS "Allow all on installments" ON installments;
DROP POLICY IF EXISTS "Allow all on notifications" ON notifications;
DROP POLICY IF EXISTS "Allow all on business_settings" ON business_settings;

-- Novas Políticas Restritivas

-- Clientes: Apenas usuários autenticados podem ver e editar
CREATE POLICY "Authenticated select clients" ON clients FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated insert clients" ON clients FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated update clients" ON clients FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated delete clients" ON clients FOR DELETE USING (auth.role() = 'authenticated');

-- Produtos: Público pode ver (Catálogo), mas apenas autenticados podem editar
CREATE POLICY "Public select products" ON products FOR SELECT USING (true);
CREATE POLICY "Authenticated insert products" ON products FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated update products" ON products FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated delete products" ON products FOR DELETE USING (auth.role() = 'authenticated');

-- Vendas e Itens: Apenas autenticados
CREATE POLICY "Authenticated all sales" ON sales FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated all sale_items" ON sale_items FOR ALL USING (auth.role() = 'authenticated');

-- Parcelas: Apenas autenticados
CREATE POLICY "Authenticated all installments" ON installments FOR ALL USING (auth.role() = 'authenticated');

-- Notificações: Apenas autenticados
CREATE POLICY "Authenticated all notifications" ON notifications FOR ALL USING (auth.role() = 'authenticated');

-- Configurações: Apenas autenticados
CREATE POLICY "Authenticated all business_settings" ON business_settings FOR ALL USING (auth.role() = 'authenticated');
