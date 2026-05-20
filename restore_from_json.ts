import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BACKUP_PATH = 'c:/Users/Ramon/Downloads/backup_vallechic_2026-03-31.json';

async function restore() {
  console.log('--- Iniciando Restauração de Dados ---');

  if (!fs.existsSync(BACKUP_PATH)) {
    console.error(`Erro: Arquivo de backup não encontrado em: ${BACKUP_PATH}`);
    return;
  }

  const rawData = fs.readFileSync(BACKUP_PATH, 'utf8');
  const backup = JSON.parse(rawData);

  // 1. Business Settings
  if (backup.business_settings && backup.business_settings.length > 0) {
    console.log('Restaurando configurações do negócio...');
    const { error } = await supabase.from('business_settings').upsert(backup.business_settings);
    if (error) console.error('Erro em business_settings:', error.message);
    else console.log('Configurações restauradas.');
  }

  // 2. Clients
  if (backup.clients && backup.clients.length > 0) {
    console.log('Restaurando clientes...');
    const { error } = await supabase.from('clients').upsert(backup.clients);
    if (error) console.error('Erro em clients:', error.message);
    else console.log(`${backup.clients.length} clientes restaurados.`);
  }

  // 3. Products
  if (backup.products && backup.products.length > 0) {
    console.log('Restaurando produtos...');
    const { error } = await supabase.from('products').upsert(backup.products);
    if (error) console.error('Erro em products:', error.message);
    else console.log(`${backup.products.length} produtos restaurados.`);
  }

  // 4. Sales
  if (backup.sales && backup.sales.length > 0) {
    console.log('Restaurando vendas...');
    const { error } = await supabase.from('sales').upsert(backup.sales);
    if (error) console.error('Erro em sales:', error.message);
    else console.log(`${backup.sales.length} vendas restauradas.`);
  }

  // 5. Sale Items
  if (backup.sale_items && backup.sale_items.length > 0) {
    console.log('Restaurando itens de venda...');
    const { error } = await supabase.from('sale_items').upsert(backup.sale_items);
    if (error) console.error('Erro em sale_items:', error.message);
    else console.log(`${backup.sale_items.length} itens restaurados.`);
  }

  // 6. Installments
  if (backup.installments && backup.installments.length > 0) {
    console.log('Restaurando parcelas...');
    const { error } = await supabase.from('installments').upsert(backup.installments);
    if (error) console.error('Erro em installments:', error.message);
    else console.log(`${backup.installments.length} parcelas restauradas.`);
  }

  console.log('--- Restauração Concluída ---');
}

restore().catch(err => {
  console.error('Erro inesperado durante a restauração:', err);
});
