# LIFE DISCOVERY ENGINE

```bash
docker compose -f infrastructure/docker/docker-compose.yml up --build
```

## Web na Vercel e Neon

O app web usa Next 16.4.3, React 19 e Node 26. O catálogo fica disponível sem login; dados pessoais exigem uma conta compartilhada por casal. O banco e o Neon Auth são acessados pelo servidor.

Em `apps/web`, copie `.env.example` para `.env.local`. Cadastre as mesmas variáveis em **Vercel → Project → Settings → Environment Variables**, escolhendo o ambiente correto:

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | Conexão direta do Neon, também usada nas migrações |
| `DATABASE_URL_POOLED` | Conexão pooled preferida pelo app |
| `NEON_AUTH_BASE_URL` | URL do Neon Managed Auth da mesma branch |
| `NEON_AUTH_COOKIE_SECRET` | Segredo aleatório privado de pelo menos 32 caracteres |
| `CRON_SECRET` | Segredo aleatório privado para autenticar a coleta |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Token público do Mapbox |

As demais chaves de fontes estão descritas no exemplo. Nunca use prefixo `NEXT_PUBLIC_` para banco, Auth ou cron. Preview deve usar uma branch Neon e segredos próprios; não copie as conexões de Production. Cada branch tem seu próprio Auth, usuários e domínios autorizados.

```bash
cd apps/web
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

As migrações são versionadas em `db/migrations`. O seed importa o catálogo local somente quando a fonte ainda não existe. Execute esses comandos com as variáveis do ambiente desejado já carregadas, sem imprimir suas conexões.

### Autenticação e sincronização

No Neon Auth, habilite e-mail/senha, verificação por OTP, recuperação de senha e Google. Autorize a URL de produção e a URL de cada preview; para desenvolvimento, autorize o localhost com a porta usada. As telas de recuperação usam os componentes oficiais do provedor.

O beta usa os remetentes de teste e Google compartilhado do Neon. Antes do lançamento definitivo, configure remetente próprio e credenciais Google próprias. Testar o recebimento real de código, o link de recuperação e o consentimento Google exige uma caixa de e-mail e uma conta Google reais.

`GET /api/me/state` e `PATCH /api/me/state` usam a sessão autenticada. A identidade esperada na mutação serve apenas para rejeitar uma troca de conta durante o envio. Cada operação tem ID único e versão; conflitos são relidos e reaplicados. O navegador mantém cache e fila separados por conta, inclusive sem conexão. A sincronização ocorre após alterações, ao voltar à aba, ao reconectar e a cada **30 segundos enquanto a aba está visível**. A importação do armazenamento antigo pede confirmação e acontece uma vez por conta.

### Atualização das informações

O cron da Vercel chama `/api/internal/catalog-refresh` diariamente às **09:00 UTC (6h em São Paulo)** com `Authorization: Bearer CRON_SECRET`. A execução pode atrasar conforme o serviço. Cada fonte tem seu resultado registrado; falhas preservam os últimos itens válidos. Snapshots ficam por 30 dias. Consultas de sessões de cinema, streaming, receitas e clima continuam usando seus caches online.

### Verificação

```bash
pnpm build
node --experimental-strip-types --test scripts/test-account-state.mjs scripts/test-watch-availability.mjs
node --test scripts/test-recommendation-images.cjs
```

Os testes de integração de banco (`test-account-repository.cjs` e `test-catalog-refresh.cjs`) exigem a branch isolada de preview. O teste de coleta usa uma execução diária limpa, fontes de teste e limpa seus próprios registros ao terminar.
