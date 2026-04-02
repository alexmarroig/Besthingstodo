# Life Discovery Mobile

Primeira versao mobile do produto em Expo + React Native.

## O que ja existe

- navegacao por tabs
- feed principal com recomendacoes e fallback curado
- tela de Watch com foco em cinema e series
- tela de Concierge com respostas estruturadas
- tela de mapa mobile com leitura espacial por bairro e distancia
- tela de Date Night com montagem de plano
- favoritos e agenda com persistencia local
- onboarding mobile completo com sincronizacao opcional para a API
- tela de Profile/Auth para login, registro, resumo local e ajustes do casal
- integracao com a API existente do monorepo

## Rodando

1. Instale as dependencias do workspace:
   - `pnpm install`
2. Rode a stack backend:
   - `docker compose -f infrastructure/docker/docker-compose.yml up --build -d`
3. Inicie o app mobile:
   - `pnpm --filter @life/mobile start`

## Variaveis uteis

O app aceita:

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_CONCIERGE_URL`
- `EXPO_PUBLIC_DATE_NIGHT_URL`

Exemplo:

```powershell
$env:EXPO_PUBLIC_API_URL="http://127.0.0.1:8000"
$env:EXPO_PUBLIC_CONCIERGE_URL="http://127.0.0.1:8007"
$env:EXPO_PUBLIC_DATE_NIGHT_URL="http://127.0.0.1:8009"
pnpm --filter @life/mobile start
```

## Observacao importante

`localhost` funciona bem no iOS Simulator. No Android Emulator, normalmente o host precisa ser `10.0.2.2`. Em aparelho fisico, use o IP local da sua maquina.

## APK standalone

Para virar APK instalavel sem Expo Go:

1. Configure URLs publicas reais:
   - copie `apps/mobile/.env.example` para um `.env` local ou configure as mesmas variaveis no ambiente de build
   - `EXPO_PUBLIC_API_URL`
   - `EXPO_PUBLIC_CONCIERGE_URL`
   - `EXPO_PUBLIC_DATE_NIGHT_URL`
2. Entre no Expo/EAS:
   - `pnpm dlx eas-cli login`
3. Gere o APK:
   - `pnpm build:mobile:apk`

O projeto agora inclui:

- `apps/mobile/eas.json` com perfil `preview` para gerar APK e `production` para AAB
- assets nativos em `apps/mobile/assets`
- `app.json` com `icon`, `adaptiveIcon` e `splash`

## Comportamento sem backend publico

Em build standalone, se as URLs publicas nao forem configuradas, o app nao tenta mais `localhost` no aparelho. Nesse caso ele continua funcionando em modo local com:

- onboarding salvo no celular
- favoritos e agenda locais
- feed curado
- planner fallback
- concierge fallback

Para login, criacao de conta, recuperacao real, sincronizacao e IA online, ainda e necessario publicar os servicos backend.
