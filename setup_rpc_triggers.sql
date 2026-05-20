-- Requisito 1: Reserva de Estoque no Checkout (Atomicidade e Rollback)

-- Função RPC para confirmar o checkout e reservar o estoque
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
  v_item RECORD;
  v_stock INTEGER;
BEGIN
  -- a) Iniciar uma transação SQL (já implícito no plpgsql)
  
  -- b) Verificar se o cliente existe
  SELECT EXISTS(SELECT 1 FROM clients WHERE id = p_client_id) INTO v_client_exists;
  IF NOT v_client_exists THEN
    RAISE EXCEPTION 'Cliente não encontrado.';
  END IF;

  -- c) Obter todos os itens associados ao sale_id
  FOR v_item IN SELECT product_id, quantity FROM sale_items WHERE sale_id = p_sale_id
  LOOP
    -- d) Verificar se a quantidade em inventory (products) é suficiente
    SELECT stock INTO v_stock FROM products WHERE id = v_item.product_id FOR UPDATE;
    
    IF v_stock IS NULL OR v_stock < v_item.quantity THEN
      RAISE EXCEPTION 'Estoque insuficiente para o produto %', v_item.product_id;
    END IF;

    -- e) Atualizar a tabela inventory (products) subtraindo a quantidade
    UPDATE products 
    SET stock = stock - v_item.quantity,
        published = CASE WHEN stock - v_item.quantity <= 0 THEN false ELSE published END
    WHERE id = v_item.product_id;
  END LOOP;

  -- f) Atualizar a tabela sales para status: 'aguardando_confirmacao'
  UPDATE sales 
  SET status = 'aguardando_confirmacao', 
      payment_method = p_payment_method,
      client_id = p_client_id
  WHERE id = p_sale_id;

  -- g) Criar um log de movimentação de estoque com tipo 'Reserva' (se existir tabela de log)
  -- Assumindo que não há tabela de log explícita no schema atual, mas se houver, seria inserido aqui.
  
  -- h) Efetivar a transação (COMMIT implícito ao final da função)
END;
$$;

-- Função para o Trigger de Rollback
CREATE OR REPLACE FUNCTION rollback_waiting_sale_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
BEGIN
  -- Sempre que uma venda com status: 'aguardando_confirmacao' for deletada
  IF OLD.status = 'aguardando_confirmacao' THEN
    -- Adicionar de volta ao estoque dos itens daquela venda
    FOR v_item IN SELECT product_id, quantity FROM sale_items WHERE sale_id = OLD.id
    LOOP
      UPDATE products SET stock = stock + v_item.quantity WHERE id = v_item.product_id;
    END LOOP;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Criar o Trigger
DROP TRIGGER IF EXISTS trg_rollback_waiting_sale_stock ON sales;
CREATE TRIGGER trg_rollback_waiting_sale_stock
BEFORE DELETE ON sales
FOR EACH ROW
EXECUTE FUNCTION rollback_waiting_sale_stock();

-- Requisito 3: Fluxo de Confirmação de Venda e Validação de Cliente

-- Função para obter o status do cliente
CREATE OR REPLACE FUNCTION get_sale_confirmation_context(p_sale_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_status TEXT;
BEGIN
  SELECT c.status INTO v_client_status
  FROM sales s
  JOIN clients c ON s.client_id = c.id
  WHERE s.id = p_sale_id;
  
  RETURN v_client_status;
END;
$$;

-- Função para finalizar a venda aguardando
CREATE OR REPLACE FUNCTION finalize_waiting_sale(p_sale_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sale RECORD;
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

  -- b) Incrementar purchases do cliente em +1
  UPDATE clients SET purchases = COALESCE(purchases, 0) + 1 WHERE id = v_sale.client_id;

  -- c) Integração com Crediário (Condicional)
  IF v_sale.payment_method = 'crediario' THEN
    -- Mudar o status da venda para 'pendente'
    UPDATE sales SET status = 'pendente', amount_paid = 0 WHERE id = p_sale_id;
    
    -- Criar automaticamente 1 parcela na tabela installments para daqui a 30 dias
    v_due_date := CURRENT_DATE + INTERVAL '30 days';
    INSERT INTO installments (sale_id, client_id, amount, due_date, status)
    VALUES (p_sale_id, v_sale.client_id, v_sale.total_amount, v_due_date, 'pendente');
    
    -- Mudar o status do cliente para 'Inadimplente'
    UPDATE clients SET payment_status = 'Inadimplente' WHERE id = v_sale.client_id;
  ELSE
    -- a) Mudar o status da venda para 'pago'
    UPDATE sales SET status = 'pago', amount_paid = v_sale.total_amount WHERE id = p_sale_id;
  END IF;
END;
$$;
