# REGRAS OBRIGATORIAS PARA CLAUDE - Conta Atlas

## DEPLOY DO FRONTEND (Conta Atlas)

**SEMPRE USE:**
```bash
cd ~/ContaAtlas && npm run deploy
```

Este comando:
1. Executa `next build --webpack`
2. Reinicia o PM2 automaticamente
3. Verifica se o servidor esta saudavel

**SE O BUILD FALHAR:** Corrija os erros e execute `npm run deploy` novamente.

**SE PRECISAR APENAS REINICIAR (sem mudancas de codigo):**
```bash
PM2_HOME=/home/cmo/.pm2 pm2 restart conta-atlas --update-env
```

## DEPLOY DO BACKEND (Atlas-API)

```bash
cd "~/Painel Atlas/Atlas-API" && npm run build && PM2_HOME=/home/cmo/.pm2 pm2 restart atlas-api --update-env
```

## PM2 - Comandos Uteis

```bash
# SEMPRE use PM2_HOME=/home/cmo/.pm2 antes dos comandos pm2

# Ver logs
PM2_HOME=/home/cmo/.pm2 pm2 logs conta-atlas --lines 50

# Status de todos os processos
PM2_HOME=/home/cmo/.pm2 pm2 status

# Restart manual
PM2_HOME=/home/cmo/.pm2 pm2 restart conta-atlas --update-env
```

## Processos PM2 Ativos

| Nome | Porta | Descricao |
|------|-------|-----------|
| conta-atlas | 11338 | Frontend v2 - Conta Atlas (atlasdao.app) |
| atlas-panel | 11337 | Frontend v1 - Painel (painel.atlasdao.info) — NUNCA MODIFICAR |
| atlas-api | 19997 | Backend NestJS (api.atlasdao.info) |
| atlas-bridge-prod | - | Bridge principal |
| atlas-alert-bot | - | Bot de alertas |

## REGRAS CRITICAS

- v1 em ~/Painel Atlas/Atlas-Panel — NUNCA MODIFICAR
- Backend compartilhado em ~/Painel Atlas/Atlas-API
- Porta: 11338
- Build usa `--webpack` (nao turbopack) por causa das libs crypto (secp256k1-zkp, liquidjs-lib)
- Design: minimalista, branco/preto, seguir sistema (dark/light)
- Seed phrase: LOCAL ONLY, nunca cloud
- Nunca pedir telefone. Identidade = email + @username
- CSP precisa de 'unsafe-inline' e 'unsafe-eval' para Next.js funcionar
- NEXT_PUBLIC_API_URL aponta para api.atlasdao.info (enquanto api.atlasdao.app nao tem DNS)
- Toast library: sonner (NAO usar react-hot-toast)
- Terminologia: "Conta Atlas" (nao "Painel", nao "Wallet")
- Seguranca: dizer "encriptado de ponta a ponta" (nao "AES-256-GCM")

## CAUTELA EM PRODUCAO

- Estamos em producao, tenha cautela
- Sempre verifique se o build passou antes de considerar a tarefa completa
- Se houver erros no console apos deploy, corrija imediatamente
