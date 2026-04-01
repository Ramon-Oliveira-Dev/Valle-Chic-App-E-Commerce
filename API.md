# API - Valle Chic E-commerce

## Visão Geral
O sistema utiliza Supabase como backend, com APIs RESTful para operações CRUD.

## Endpoints Principais

### Produtos
- **GET** `/products` - Lista produtos (público)
- **POST** `/products` - Criar produto (autenticado)
- **PUT** `/products/{id}` - Atualizar produto (autenticado)
- **DELETE** `/products/{id}` - Deletar produto (autenticado)

### Clientes
- **GET** `/clients` - Lista clientes (autenticado)
- **POST** `/clients` - Criar cliente (autenticado)
- **PUT** `/clients/{id}` - Atualizar cliente (autenticado)
- **DELETE** `/clients/{id}` - Deletar cliente (autenticado)

### Vendas
- **GET** `/sales` - Lista vendas (autenticado)
- **POST** `/sales` - Criar venda (autenticado)

### Configurações
- **GET** `/business_settings` - Configurações (autenticado)
- **PUT** `/business_settings` - Atualizar configurações (autenticado)

## Autenticação
- **Bearer Token**: Supabase JWT
- **RLS**: Políticas aplicadas em todas as tabelas

## Rate Limiting
- Configurado via painel Supabase
- Limites padrão: 1000 req/min por IP

## Logs
- **Tabela**: `logs`
- **Campos**: level, message, context, user_id, created_at
- **Políticas**: Insert público, select autenticado

## Segurança
- Todas as operações protegidas por RLS
- Validação client-side com Zod
- CSP implementado