# Segurança - Valle Chic E-commerce

## Visão Geral
Este documento descreve as medidas de segurança implementadas no sistema Valle Chic.

## Políticas de Segurança

### Row Level Security (RLS)
- **Aplicado**: Todas as tabelas têm RLS habilitado
- **Políticas**:
  - Clientes: Apenas usuários autenticados
  - Produtos: Leitura pública, edição autenticada
  - Vendas/Financeiro: Apenas autenticados
- **Arquivo**: `harden_rls.sql` - Executar no Supabase SQL Editor

### Autenticação
- **Provedor**: Supabase Auth
- **Métodos**: Email/Senha
- **Proteção**: RLS em todas as operações

### Validação de Entrada
- **Biblioteca**: Zod para validação client-side
- **Campos validados**: Nome, preços, estoque, tipos de arquivo
- **Sanitização**: Tipos de arquivo whitelist (JPEG, PNG, WebP)

### Content Security Policy (CSP)
- **Implementado**: Meta tag em `index.html`
- **Restrições**:
  - Scripts: self, unsafe-inline (necessário), fonts
  - Estilos: self, unsafe-inline, fonts
  - Imagens: self, data, https
  - Conexões: self, Supabase URLs

### Rate Limiting
- **Configurado**: Via painel Supabase
- **Limites**: Padrão do Supabase (recomendado ajustar conforme uso)

## Vulnerabilidades Conhecidas
- Nenhuma exposição de chaves API no código
- Validação implementada para prevenir injeções
- RLS protege dados sensíveis

## Monitoramento
- **Logs**: Tabela `logs` para auditoria
- **Níveis**: error, warning, info
- **Contexto**: JSON com detalhes da operação

## Recomendações
1. Executar `harden_rls.sql` no Supabase
2. Configurar rate limiting no painel
3. Revisar logs regularmente
4. Manter dependências atualizadas