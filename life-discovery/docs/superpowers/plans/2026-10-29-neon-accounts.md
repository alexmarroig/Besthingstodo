# Neon, contas de casal e catálogo diário

Plano aprovado pelo usuário em 29/10/2026 nesta conversa. Executar inline com superpowers:executing-plans.

## Contrato
- Cadastro beta aberto: uma conta compartilhada por casal, email/senha e Google via Neon Managed Better Auth.
- Next 16.4.3, React 19, Node 26. Banco somente no servidor, conta identificada pela sessão.
- Dados privados: perfil, favoritos/coleções, agenda, itens adicionados, últimos 300 sinais e memória do concierge.
- Operações idempotentes e controle de versão; cache/fila separados por conta, polling visível de 30 segundos, importação local confirmada uma vez.
- Catálogo com snapshots de 30 dias, coleta diária 09:00 UTC/06:00 São Paulo. Falha de fonte não apaga os últimos dados válidos. Fontes consultadas diretamente, nunca por rotas que releem snapshots.
- Preview usa branch Neon separada. Configurar Auth, segredos e migrações sem exibir credenciais. Validar preview antes de produção.

## Etapas
- [x] Banco: migrações versionadas, importação inicial e testes de mutações/concorrência.
- [x] Auth: cadastro, verificação por código, email/senha, Google, recuperação de senha e logout.
- [x] APIs privadas: GET/PATCH /api/me/state e perfil autenticado.
- [x] Cliente: cache/fila por conta, importação, sincronização e bloqueio de gravação anônima.
- [x] Catálogo: substituir Supabase, cron protegido, ingestão independente e retenção.
- [x] Verificação automatizada: testes, build, browser, isolamento de contas, preview e deploy.

## Registro de execução
- Base: fae61ea. Worktree limpo existente reutilizado; branch codex/neon-accounts.
- Variáveis de banco cadastradas apenas em Production; nunca reutilizar conexão de produção em preview.
- Auth estava desligado na criação do projeto Neon. Pré-requisito externo a verificar antes de ativar login.
- Interface compartilhada: reducer puro de operações será usado por servidor e cache otimista; mutações retornam estado, versão e IDs reconhecidos.
- Banco grava estado JSONB por conta e log persistente de IDs de operações; commit SQL transacional com CAS evita perda de atualizações concorrentes.

- Neon CLI autorizado; Auth habilitado em produção e preview-accounts, com bancos e segredos separados. Migração 0001 e seed não destrutivo executados em ambos.
- Build Next 16.4.3 e tipos passaram. Testes de reducer (7), cinema (3), imagens (4), concorrência/isolamento/replay (2) e coleta tolerante a falhas (1) passaram.
- Browser em build de produção local validou login por senha, bloqueio de usuário não verificado, duas sessões da mesma conta, fila offline, atualização de agenda e logout. Fixture descartável confirmada apenas na branch de testes; entrega real de email/OTP e consentimento Google requerem validação humana.
- Revisão independente corrigiu vínculo da fila à conta antes do commit, remoção por item da agenda, proteção de perfil editado na importação e igualdade independente da ordem JSONB.
- Preview final 205208a passou em desktop e celular, incluindo login, API privada, cinema, comida, Mapbox, agenda e recuperação de senha. O mapa carregou o estilo externo sem bloqueios de CSP.
- Produção publicada em besthingstodo-plum.vercel.app. As conexões de produção foram substituídas pelas conexões verificadas da branch correta do Neon. Cron confirmado na API da Vercel: /api/internal/catalog-refresh, 0 9 * * *.
- Primeira coleta de produção: HTTP 200, resultado parcial esperado, 13 fontes atualizadas de 26 consultadas. TMDB retornou 20 itens e Geoapify 33. Fontes indisponíveis preservaram os últimos dados válidos. A conta descartável de QA foi removida do preview.
- Pendente de validação humana: recebimento real do código e do link de recuperação por e-mail e conclusão do consentimento Google. O início do OAuth e a solicitação de recuperação foram aceitos pelo provedor; a confirmação da solicitação apareceu no formulário oficial.
