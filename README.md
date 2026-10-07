# Casa Nova

Lista compartilhada para orçar tudo o que falta comprar e instalar no apartamento novo.

O mesmo app roda em três lugares e escolhe sozinho onde guardar os dados:

| Onde | Dados | Fotos |
| --- | --- | --- |
| Vercel (ou `vercel dev`) | Upstash Redis, via `api/` | Vercel Blob, via `api/photos` |
| Artifact no claude.ai | banco compartilhado do artifact | armazenamento do artifact |
| `npm run dev` | `localStorage` do navegador (só seu) | `localStorage` |

## Publicar na Vercel

1. Suba este repositório no GitHub e importe o projeto na Vercel. Ela detecta o Vite sozinha.
2. Na aba **Storage** do projeto, crie e conecte:
   - um **Upstash Redis** (KV), para os itens;
   - um **Blob** store **privado**, para as fotos.
   As chaves de acesso entram sozinhas nas variáveis de ambiente.
3. Em **Settings → Environment Variables**, crie `APP_PASSWORD` com a senha de vocês.
4. Faça um novo deploy (**Deployments → Redeploy**) para as variáveis valerem.

Quem abrir o link precisa da senha. Ela fica salva no navegador por um ano.
As mudanças de um aparecem para o outro em até 3 segundos.

## Desenvolver

```bash
npm install
npm run dev          # só a interface, dados no localStorage
npx vercel dev       # interface + API, usando o Redis e o Blob do projeto (rode `npx vercel env pull` antes)
```

## Publicar no claude.ai

```bash
npm run build:artifact   # gera dist/artifact.html
```

## Estrutura

- `api/`: rotas da Vercel. `state` (ler tudo), `items`, `settings`, `photos`, `login`.
- `src/App.jsx`: estado da tela e as ações.
- `src/components/`: resumo, abas de ambiente, lista, opções com fotos, editor, login.
- `src/data/`: um backend para cada lugar (`vercelBackend`, `claudeBackend`, `localBackend`) e a escolha entre eles.
- `src/lib/`: dinheiro, totais e fotos.
