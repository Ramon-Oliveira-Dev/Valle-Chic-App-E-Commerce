# Desenvolvimento - Valle Chic E-commerce

## Setup Local

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Conta Supabase

### Instalação
```bash
npm install
```

### Configuração
1. Copie `.env.example` para `.env.local`
2. Configure variáveis do Supabase:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Desenvolvimento
```bash
npm run dev
```

### Testes
```bash
# Unitários
npm run test

# E2E
npx playwright test
```

### Build
```bash
npm run build
npm run preview
```

## Estrutura do Projeto

```
src/
├── components/     # Componentes reutilizáveis
├── pages/         # Páginas da aplicação
│   ├── admin/     # Painel administrativo
├── contexts/      # Contextos React
├── hooks/         # Hooks customizados
├── lib/           # Utilitários e configurações
├── services/      # APIs e serviços
├── store/         # Estado global (Zustand)
└── test/          # Configuração de testes
```

## Convenções de Código

### TypeScript
- Strict mode habilitado
- Interfaces para tipos complexos
- Zod para validação

### Componentes
- Props bem tipadas
- Hooks para lógica reutilizável
- Nomes em PascalCase

### Estilos
- Tailwind CSS
- Tema navy/brown
- Design system consistente

## Debugging

### Logs
- Console para desenvolvimento
- Tabela `logs` para produção

### Ferramentas
- React DevTools
- Network tab
- Supabase Dashboard

## Deploy

### Produção
1. Executar `npm run build`
2. Upload do `dist/` para hosting
3. Configurar variáveis de ambiente
4. Executar `harden_rls.sql` no Supabase