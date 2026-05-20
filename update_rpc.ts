import { supabase } from './src/lib/supabase';

async function updateRPC() {
  console.log('Updating RPCs...');

  const sql = `
-- Remove stock deduction from checkout
CREATE OR REPLACE FUNCTION confirm_checkout_and_reserve_stock(
  p_sale_id UUID,
  p_client_id UUID,
  p_payment_method TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_exists BOOLEAN;
BEGIN
  -- Verificar se o cliente existe
  SELECT EXISTS(SELECT 1 FROM clients WHERE id = p_client_id) INTO v_client_exists;
  IF NOT v_client_exists THEN
    RAISE EXCEPTION 'Cliente não encontrado.';
  END IF;

  -- Atualizar a tabela sales para status: 'aguardando_confirmacao'
  UPDATE sales 
  SET status = 'aguardando_confirmacao', 
      payment_method = p_payment_method,
      client_id = p_client_id
  WHERE id = p_sale_id;
END;
$$;

-- Add stock deduction to finalize_waiting_sale
CREATE OR REPLACE FUNCTION finalize_waiting_sale(p_sale_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sale RECORD;
  v_item RECORD;
  v_stock INTEGER;
  v_due_date DATE;
BEGIN
  -- Obter dados da venda
  SELECT * INTO v_sale FROM sales WHERE id = p_sale_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venda não encontrada.';
  END IF;

  IF v_sale.status != 'aguardando_confirmacao' THEN
    RAISE EXCEPTION 'A venda não está aguardando confirmação.';
  END IF;

  -- Verificar e deduzir estoque
  FOR v_item IN SELECT product_id, quantity FROM sale_items WHERE sale_id = p_sale_id
  LOOP
    SELECT stock INTO v_stock FROM products WHERE id = v_item.product_id FOR UPDATE;
    
    IF v_stock IS NULL OR v_stock < v_item.quantity THEN
      RAISE EXCEPTION 'Saldo insuficiente para o produto %', v_item.product_id;
    END IF;

    UPDATE products 
    SET stock = stock - v_item.quantity,
        published = CASE WHEN stock - v_item.quantity <= 0 THEN false ELSE published END
    WHERE id = v_item.product_id;
  END LOOP;

  -- Incrementar purchases do cliente em +1
  UPDATE clients SET purchases = COALESCE(purchases, 0) + 1 WHERE id = v_sale.client_id;

  -- Integração com Crediário (Condicional)
  IF v_sale.payment_method = 'crediario' THEN
    UPDATE sales SET status = 'pendente', amount_paid = 0 WHERE id = p_sale_id;
    
    v_due_date := CURRENT_DATE + INTERVAL '30 days';
    INSERT INTO installments (sale_id, client_id, amount, due_date, status)
    VALUES (p_sale_id, v_sale.client_id, v_sale.total_amount, v_due_date, 'pendente');
    
    UPDATE clients SET payment_status = 'Inadimplente' WHERE id = v_sale.client_id;
  ELSE
    UPDATE sales SET status = 'pago', amount_paid = v_sale.total_amount WHERE id = p_sale_id;
  END IF;
END;
$$;

-- Função para cancelar venda
CREATE OR REPLACE FUNCTION cancel_sale(p_sale_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sale RECORD;
  v_item RECORD;
BEGIN
  SELECT * INTO v_sale FROM sales WHERE id = p_sale_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venda não encontrada.';
  END IF;

  IF v_sale.status = 'cancelada' THEN
    RAISE EXCEPTION 'A venda já está cancelada.';
  END IF;

  -- Se a venda já foi paga ou pendente (estoque já foi deduzido), estornar estoque
  IF v_sale.status IN ('pago', 'pendente') THEN
    FOR v_item IN SELECT product_id, quantity FROM sale_items WHERE sale_id = p_sale_id
    LOOP
      UPDATE products SET stock = stock + v_item.quantity WHERE id = v_item.product_id;
    END LOOP;
    
    -- Decrementar purchases do cliente
    UPDATE clients SET purchases = GREATEST(COALESCE(purchases, 0) - 1, 0) WHERE id = v_sale.client_id;
    
    -- Se for crediário, cancelar parcelas
    IF v_sale.payment_method = 'crediario' THEN
      UPDATE installments SET status = 'cancelada' WHERE sale_id = p_sale_id;
      -- Nota: A lógica de inadimplência do cliente pode precisar ser reavaliada aqui, 
      -- mas por simplicidade, apenas cancelamos as parcelas.
    END IF;
  END IF;

  -- Atualizar status da venda
  UPDATE sales SET status = 'cancelada' WHERE id = p_sale_id;
END;
$$;
  `;

  // We can't easily run raw SQL via supabase-js v2 without a specific RPC.
  // Wait, does `migrate.ts` have a way to run raw SQL?
}

updateRPC();
