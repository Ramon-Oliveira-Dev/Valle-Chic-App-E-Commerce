import { supabase } from './src/lib/supabase';

async function migrate() {
  console.log('Starting comprehensive migration check...');

  const tables = [
    {
      name: 'clients',
      sql: `CREATE TABLE clients (
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
);`
    },
    {
      name: 'products',
      sql: `CREATE TABLE products (
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
  img TEXT,
  is_kit BOOLEAN DEFAULT false,
  kit_items JSONB DEFAULT '[]'::jsonb,
  individual_ids TEXT[] DEFAULT '{}'::text[],
  colors TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);`
    },
    {
      name: 'sales',
      sql: `CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  total_amount NUMERIC(10,2) NOT NULL,
  amount_paid NUMERIC(10,2) DEFAULT 0,
  payment_method TEXT,
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  status TEXT DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);`
    },
    {
      name: 'sale_items',
      sql: `CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);`
    },
    {
      name: 'installments',
      sql: `CREATE TABLE installments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pendente',
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);`
    },
    {
      name: 'notifications',
      sql: `CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);`
    },
    {
      name: 'business_settings',
      sql: `CREATE TABLE business_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimated_revenue NUMERIC(10,2) DEFAULT 0,
  target_working_capital NUMERIC(10,2) DEFAULT 0,
  working_capital_percentage INTEGER DEFAULT 30,
  profit_percentage INTEGER DEFAULT 20,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
INSERT INTO business_settings (estimated_revenue, target_working_capital, working_capital_percentage, profit_percentage) VALUES (0, 0, 30, 20);`
    }
  ];

  for (const table of tables) {
    try {
      console.log(`Checking table: ${table.name}...`);
      const { error } = await supabase.from(table.name).select('*').limit(1);
      
      if (error && error.code === '42P01') {
        console.log(`Table ${table.name} is missing. SQL to create:`);
        console.log(table.sql);
      } else if (error) {
        console.error(`Error checking table ${table.name}:`, error);
      } else {
        console.log(`Table ${table.name} exists.`);
        
        // If table exists, check for specific columns in products
        if (table.name === 'products') {
          const columns = [
            { name: 'is_kit', type: 'BOOLEAN DEFAULT false' },
            { name: 'kit_items', type: "JSONB DEFAULT '[]'::jsonb" },
            { name: 'individual_ids', type: "TEXT[] DEFAULT '{}'::text[]" },
            { name: 'colors', type: "TEXT[] DEFAULT '{}'::text[]" },
            { name: 'img', type: 'TEXT' }
          ];
          
          for (const col of columns) {
            const { error: colError } = await supabase.from('products').select(col.name).limit(1);
            if (colError && colError.code === '42703') {
              console.log(`Column ${col.name} missing in products. SQL to add:`);
              console.log(`ALTER TABLE products ADD COLUMN ${col.name} ${col.type};`);
            }
          }
        }
      }
    } catch (err) {
      console.error(`Unexpected error checking table ${table.name}:`, err);
    }
  }

  console.log('Migration check complete.');
}

migrate();
