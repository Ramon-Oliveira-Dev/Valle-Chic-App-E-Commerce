# 🚀 Guia de Deploy no Vercel & Preservação Total de Dados (Valle Chic)

Para garantir que **todos os itens, vendas, clientes e histórico sejam 100% preservados** ao publicar o sistema no Vercel, siga este guia prático.

---

## 🔒 1. Como seus dados estão protegidos

O sistema conta com **tripla camada de segurança**:
1. **Supabase Cloud (Banco Central):** Quando configurado no Vercel, todos os dados ficam salvos na nuvem e sincronizam em tempo real em qualquer celular, computador ou tablet.
2. **Double Backup Automático (Offline / Local):** Toda venda, produto e cliente cadastrado é gravado simultaneamente no armazenamento local seguro (`localStorage`), garantindo que nenhuma informação seja perdida caso a conexão oscile.
3. **Backup Completo em 1 Clique (.json):** No topo do **Dashboard Administrativo**, existe o botão **"Baixar Backup"** que gera um arquivo `.json` com todos os produtos, vendas, clientes, crediário e histórico para você guardar ou restaurar quando quiser no botão **"Restaurar"**.

---

## 🛠️ 2. Variáveis de Ambiente no Vercel (Obrigatório para Nuvem Compartilhada)

Ao criar seu projeto no **Vercel** ([vercel.com](https://vercel.com)):

1. Acesse o projeto no Vercel e vá em **Settings** > **Environment Variables**.
2. Adicione as duas variáveis do seu Supabase:

| Nome da Variável | Descrição |
| :--- | :--- |
| `VITE_SUPABASE_URL` | A URL do seu projeto Supabase (ex: `https://seu-projeto.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | A chave pública `anon` do seu projeto Supabase |

> 💡 **Dica:** Essas chaves ficam no painel do Supabase em **Project Settings** > **API**.

---

## 📦 3. Configurações de Build no Vercel

O arquivo `vercel.json` já está configurado na raiz do projeto com as regras de SPA rewrite:
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

---

## 💾 4. Como migrar seus dados atuais para o Vercel em 3 passos:

1. No seu ambiente atual (onde você cadastrou os produtos e vendas), acesse o **Dashboard Administrativo**.
2. Clique no botão dourado **"Baixar Backup"** no banner *Backup para Vercel* (será baixado um arquivo `valle-chic-backup-[data].json`).
3. Abra o link do seu app publicado no Vercel, acesse o Dashboard e clique em **"Restaurar"**, selecionando o arquivo baixado. **Pronto! Todos os dados estarão no ar instantaneamente.**
