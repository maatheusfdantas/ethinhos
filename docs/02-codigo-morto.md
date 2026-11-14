# Ethos — Inventário de código morto (Fase 0)

Data: 2026-11-14 · Branch `refactor/base`

Método: grafo de imports a partir de `src/main.jsx` (script de análise estática) + confirmação manual por `grep` de cada símbolo + `npm run lint` (oxlint).
Regra da fase: **só listar**. Foi removido (movido para `_to_delete/`) apenas o que é 100% seguro.

## 1. Movido para `_to_delete/` nesta fase

| Arquivo | Motivo |
|---|---|
| `src/components/Header.jsx` | Nunca importado (nem por nome, nem por import dinâmico). Substituído por `Nav.jsx`. |
| `src/components/GlobalProgressBar.jsx` | Nunca importado. |

## 2. Código morto confirmado, mas **não removido** (pede decisão ou cai em fase futura)

### 2.1 Exports nunca usados (nem dentro do próprio arquivo)
| Arquivo | Símbolo | Observação |
|---|---|---|
| `src/services/storage.js` | `getStorageData`, `setStorageData`, `initStorage`, `STORAGE_KEYS` | Só `isEventForDate` é usado (Dashboard). O resto é o antigo storage local, substituído por `useUserSync`. Resolve-se na Fase 3 (store novo). |
| `src/components/ui/MotionPrimitives.jsx` | `MagneticButton` | Componente sem uso. Avaliar na Fase 4 (design system). |

### 2.2 Exports desnecessários (usados só internamente; inofensivos)
- `IconLibrary.jsx`: `CLEAN_ICON_GROUPS`, `CLEAN_ICONS_MAP`
- `EthosDataViz.jsx`: `EmptyDataVizState`
- `MotionPrimitives.jsx`: `SPRING_SNAPPY`, `SPRING_SMOOTH`
- `biometricsAndAnalytics.js`: `WATER_ML_PER_KG`, `DEFAULT_GLASS_ML`, `XP_PER_LEVEL`, `getLevelTitle`
- `api.js`: `getAuthToken`, `getActiveUserId`
- `export default` duplicando o export nomeado: `AdminPortalTab.jsx`, `SocialLoginButtons.jsx`

### 2.3 Variáveis e imports não usados (lint)
O oxlint aponta **344 `no-unused-vars`** (de 421 avisos no total, 0 erros). A maioria são ícones do `lucide-react` importados e não usados, e `catch (_e)`. Distribuição:

| Arquivo | Qtd. | | Arquivo | Qtd. |
|---|---|---|---|---|
| `functions/api/[[path]].js` | 44 | | `src/components/AuthModal.jsx` | 10 |
| `server/db.js` | 43 | | `src/hooks/useUserSync.js` | 9 |
| `server/index.js` | 28 | | `src/components/TelemetryTab.jsx` | 9 |
| `src/components/AddModal.jsx` | 21 | | `src/App.jsx` | 9 |
| `src/components/ProfileTab.jsx` | 20 | | `src/components/SocialTab.jsx` | 8 |
| `src/components/AdminPortalTab.jsx` | 19 | | `src/components/LoginScreen.jsx` | 7 |
| `src/components/FocusTab.jsx` | 14 | | `server/authTokens.js` | 7 |
| `src/components/ProfileModal.jsx` | 13 | | `src/components/SupportModal.jsx` | 6 |
| `src/components/BadHabitsTab.jsx` | 13 | | demais arquivos | ≤ 5 cada |
| `server/security.js` | 11 | | | |
| `src/components/CalendarTab.jsx` | 10 | | | |

**Não limpei agora** porque mexeria em ~30 arquivos, a maioria módulos extras que serão decompostos na Fase 5 e o `functions/api` que será modularizado na Fase 1. A limpeza acontece quando cada arquivo for tocado.

Outros avisos (não são código morto, mas são dívida): 28 `only-export-components`, 25 `set-state-in-effect`, 19 `purity` (`Date.now`/`Math.random` no render), 8 `exhaustive-deps`, 3 `immutability`.

## 3. Subsistemas inteiros que viram código morto pelas decisões já tomadas
Ficam onde estão até as fases indicadas, porque ainda têm lógica a portar.

| Caminho | Por quê | Sai na |
|---|---|---|
| `server/` (Express + SQLite) | Backend oficial é `functions/api`. Antes, portar e-mail (`emailService.js`) e OAuth (`googleCalendarAuth.js`). | Fase 1 |
| `supabase/` | Migration nunca usada pelo código. | Fase 1 |
| `engine/` (Python) | Vira TS em `src/domain/engine`. Só sai depois dos testes equivalentes passarem. | Fase 2 |
| `src/utils/biometricsAndAnalytics.js` (métricas) | Duplicata da engine. | Fase 2 |
| `requirements.txt` | Só serve à engine Python. | Fase 2 |
| Dependências `express`, `cors` | Usadas só em `server/`. `resend` idem, a menos que o e-mail seja portado usando o SDK (hoje `functions/api` não o importa). | Fase 1 |
| Script `npm run server` | Aponta para `server/`. | Fase 1 |

## 4. Assets de `public/` sem referência no código (não movidos)
`login-left-prisms.png`, `login-right-prisms.png`, `ethos-logo-clean.png`, `icons.svg`, `dev1.jpg`, `dev2.jpg` (os dois últimos são usados só pelo `landing-site`, que tem cópia própria em `landing-site/public/`).
O briefing pedia para mover só as imagens de referência e os crops. Estas ficam aguardando confirmação.
