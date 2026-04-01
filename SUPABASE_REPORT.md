# Relatório de Diagnóstico e Solução: Conexão Supabase

Este relatório detalha as causas prováveis dos erros de conexão e falhas ao salvar dados (clientes, produtos, vendas) e imagens no sistema Vallechic, fornecendo as soluções passo a passo.

## 1. Análise Crítica dos Erros

Os erros relatados ("impedindo de salvar informações") geralmente ocorrem devido a três pilares fundamentais no Supabase:

### A. Configuração de Ambiente (Client-Side)
Se as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` não estiverem configuradas corretamente no painel de configurações do AI Studio, o cliente Supabase não conseguirá se autenticar, resultando em erros de rede ou "Invalid API Key".

### B. Estrutura do Banco de Dados (Schema)
O código espera que tabelas específicas existam com colunas exatas. Se uma tabela como `products` ou `clients` estiver faltando, ou se uma coluna (ex: `sku` ou `images`) não existir, a inserção falhará com erro "404 Not Found" ou "42P01 (relation does not exist)".

### C. Políticas de Segurança (RLS - Row Level Security)
Por padrão, o Supabase habilita RLS em novas tabelas. Se o RLS estiver ativo e não houver uma política (Policy) que permita `INSERT`, `UPDATE` ou `SELECT`, o banco de dados retornará "403 Forbidden", impedindo qualquer gravação de dados, mesmo que a conexão esteja "online".

### D. Armazenamento de Imagens (Storage)
O upload de imagens exige:
1.  Um **Bucket** chamado `product-images`.
2.  O Bucket deve ser **Público**.
3.  Políticas de Storage que permitam `INSERT` e `SELECT` para usuários (autenticados ou anônimos, dependendo da configuração).

---

## 2. Guia de Solução Passo a Passo

Para resolver todos os problemas de uma vez, siga estas etapas no seu painel do Supabase (https://app.supabase.com):

### Passo 1: Configurar Variáveis de Ambiente
Certifique-se de que as seguintes chaves estão configuradas no menu **Settings** do AI Studio:
- `VITE_SUPABASE_URL`: Sua URL do projeto (ex: `https://xyz.supabase.co`)
- `VITE_SUPABASE_ANON_KEY`: Sua chave "anon" pública.

### Passo 2: Criar Tabelas e Políticas (SQL Editor)
Copie e cole o código SQL abaixo no **SQL Editor** do seu projeto Supabase e clique em **RUN**. Este script criará todas as tabelas necessárias e configurará as permissões de acesso.

```sql
-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Clientes
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  birth_day INTEGER,
  birth_month INTEGER,
  is_vip BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'Ativo',
  payment_status TEXT DEFAULT 'Adimplente',
  purchases INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tabela de Produtos (Incluindo colunas para Kits e IDs Individuais)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  sku TEXT UNIQUE,
  description TEXT,
  cost_price NUMERIC(10,2) DEFAULT 0,
  sale_price NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  discounted_price NUMERIC(10,2) DEFAULT 0,
  stock INTEGER DEFAULT 0,
  accessories TEXT,
  published BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  image_url TEXT,
  images TEXT[] DEFAULT '{}',
  img TEXT, -- Coluna legada/suporte
  is_kit BOOLEAN DEFAULT false,
  kit_items JSONB DEFAULT '[]'::jsonb,
  individual_ids TEXT[] DEFAULT '{}'::text[],
  colors TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Adicionar colunas caso a tabela já exista mas as colunas não
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='is_kit') THEN
        ALTER TABLE products ADD COLUMN is_kit BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='kit_items') THEN
        ALTER TABLE products ADD COLUMN kit_items JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='individual_ids') THEN
        ALTER TABLE products ADD COLUMN individual_ids TEXT[] DEFAULT '{}'::text[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='colors') THEN
        ALTER TABLE products ADD COLUMN colors TEXT[] DEFAULT '{}'::text[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='img') THEN
        ALTER TABLE products ADD COLUMN img TEXT;
    END IF;
END $$;

-- 4. Tabela de Vendas
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  total_amount NUMERIC(10,2) NOT NULL,
  amount_paid NUMERIC(10,2) DEFAULT 0,
  payment_method TEXT,
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  status TEXT DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Adicionar client_id se faltar ou atualizar para CASCADE
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='client_id') THEN
        ALTER TABLE sales ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
    ELSE
        -- Tentar atualizar a constraint se já existir (opcional, mas bom para garantir)
        ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_client_id_fkey;
        ALTER TABLE sales ADD CONSTRAINT sales_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. Tabela de Itens da Venda
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Tabela de Parcelas (Contas a Receber)
CREATE TABLE IF NOT EXISTS installments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pendente',
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Tabela de Notificações
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. Tabela de Configurações do Negócio (Metas)
CREATE TABLE IF NOT EXISTS business_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimated_revenue NUMERIC(10,2) DEFAULT 0,
  target_working_capital NUMERIC(10,2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Inserir linha inicial de configurações se não existir
INSERT INTO business_settings (estimated_revenue, target_working_capital)
SELECT 0, 0
WHERE NOT EXISTS (SELECT 1 FROM business_settings);

-- 9. Habilitar RLS em todas as tabelas
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

-- 10. Criar políticas de acesso público (Para desenvolvimento)
CREATE POLICY "Allow all on clients" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on sales" ON sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on sale_items" ON sale_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on installments" ON installments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on business_settings" ON business_settings FOR ALL USING (true) WITH CHECK (true);
```

### Passo 3: Configurar Storage (Imagens)
No menu **Storage** do Supabase:
1.  Crie um novo Bucket chamado `product-images`.
2.  Marque a opção **Public bucket**.
3.  Vá em **Policies** (dentro de Storage) e adicione as seguintes permissões para o bucket `product-images`:
    -   **SELECT**: Permitir para todos (público).
    -   **INSERT**: Permitir para todos (ou apenas autenticados, se preferir).
    -   **UPDATE/DELETE**: Conforme sua necessidade.

---

## 3. Verificação de Erros Comuns

| Sintoma | Causa Provável | Solução |
| :--- | :--- | :--- |
| Erro "403 Forbidden" ao salvar | RLS ativo sem políticas | Execute o script SQL acima para criar as políticas `Allow all`. |
| Erro "Bucket not found" | Bucket `product-images` não existe | Crie o bucket manualmente no menu Storage do Supabase. |
| Erro "duplicate key value... sku" | SKU já existe no banco | Use um SKU diferente ou limpe a tabela de produtos. |
| Dashboard mostra "Offline" | URL ou Key incorretas | Verifique as variáveis de ambiente no AI Studio. |

## 4. Conclusão
A maioria dos problemas de "conexão" no Supabase são, na verdade, problemas de **permissão (RLS)** ou **ausência de tabelas**. Ao executar o script SQL fornecido e criar o bucket de imagens, o sistema Vallechic deverá funcionar plenamente para salvar clientes, produtos e realizar uploads.
