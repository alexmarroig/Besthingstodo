# Onde assistir e gastronomia — plano de implementação

> Execução: superpowers:executing-plans, nesta conversa.

**Objetivo:** mostrar disponibilidade brasileira de filmes/séries, sessões reais de cinema com compra de ingresso e melhorar fotos e botões da gastronomia.

**Especificação:** proposta aprovada pelo usuário em 29/10/2026 nesta conversa. Preservar Poppins, fundo #060d16, texto #f8f4ee, coral #ff7a59, dourado #f4d06f e azul #38bdf8. Fotografias com menos sobreposição escura; ações principais com ícones e altura mínima de 44px.

**Arquitetura:** consultar TMDB/JustWatch e Ingresso.com apenas no servidor, ao abrir detalhes. Separar assinatura, grátis, anúncios, aluguel e compra. Catálogo de cinema de São Paulo vem da Ingresso.com; sessões são associadas pelo ID ou título exato e ano para evitar remakes errados. Manter chaves no servidor e cache curto para sessões. Priorizar fotos explícitas sobre ilustrações/fallbacks locais. Sem novas dependências.

## Tarefas

- [x] Testar normalização de provedores BR, correspondência de filmes, sessões futuras/habilitadas e URLs seguras em `scripts/test-watch-availability.mjs`; implementar funções puras em `src/shared/watch-availability.ts`.
- [x] Adicionar serviço `app/api/_lib/watch-availability.ts`, rotas `/api/watch-availability` e `/api/cinema/now-playing`; integrar catálogo na API cliente, preservando campos de identidade.
- [x] Adicionar painel `components/discovery/watch-availability.tsx` aos detalhes, com carregamento, erros independentes, atribuição JustWatch, cinemas/datas/idiomas e links de compra reais. Séries não exibem cinema.
- [x] Melhorar prioridade/fallback das imagens em `experience-image.tsx`, resolução compartilhada e API; corrigir imagens de receitas. Refinar botões em comida, tiles e detalhes, incluindo foco e toque no celular.
- [ ] Executar testes, TypeScript e fluxo no navegador em desktop/celular; revisar diff, integrar na main autorizada e conferir deploy Vercel.

## Atenção na revisão

- Falta de chave ou indisponibilidade externa deve mostrar estado indisponível sem inventar serviços/sessões.
- Catálogo em cartaz não comprova sessão local; só listar sessões futuras e habilitadas.
- Não confundir filmes e séries com IDs iguais, remakes ou filmes de títulos semelhantes.
- Não aceitar links javascript ou hosts externos nas respostas de provedores/ingressos.
- Fotos reais dos pratos não podem ser substituídas por fachadas ou capas ilustrativas.

## Registro

- Ambiente local tem Node 24; produção usa Node 26. Build standalone local tem limitação conhecida de symlinks Windows; usar checagem de tipos e validação final Linux/Vercel.
- Trabalho isolado na branch `codex/watch-and-food`, sem alterações prévias do usuário.

- Verificação: 7 testes passaram, TypeScript sem erros; navegador com sessões reais, grupos de streaming em fixture, 12 filtros de comida com 44px e viewport móvel sem overflow (390px), sem erros de página. Revisão independente sem achados acionáveis.
