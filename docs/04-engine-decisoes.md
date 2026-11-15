# Engine de métricas em TypeScript — decisões e divergências do legado

Data: 2026-11-14 · Fase 2 · Código: `src/domain/engine/` · Origem: `engine/calculator.py`, `engine/insights.py`, `engine/service.py`

A engine é composta só de funções puras: `analyze({ commitments, entries, today, timezone })`.
Não lê relógio, rede, banco nem UI. Quem chama informa `today` (data local) e o fuso.

## 1. O que foi portado
As 10 métricas do `calculator.py` (progresso do dia, taxa de conclusão, sequência atual e melhor, regularidade, tendência, recuperação, cobertura de registro, aderência por categoria, variabilidade), o score composto com os mesmos pesos e limiares, os alertas de `insights.py` e os dados de mapa de calor e comparação semanal de `service.py`.
Itens novos pedidos no plano: melhor dia, melhor horário, quebra de sequência, consistência semanal e progresso semanal (`weeklyPeriod`, o `period` do contrato `HojeViewProps`).

## 2. Divergências do legado (o que mudou e por quê)
Nada abaixo foi copiado em silêncio. Cada item tem teste.

| # | Legado | Agora | Motivo |
|---|---|---|---|
| D1 | Um check-in por hábito e dia; o último substituía os anteriores | O progresso do dia é a **soma** dos registros não excluídos | Contrato do domínio (registro é fato imutável; desfazer = excluir) |
| D2 | O dia de hoje ainda em aberto contava como falha na taxa e na recuperação | Hoje em aberto é **pendente**: fora de taxas, sequência e recuperação | Quem abre o app de manhã não pode ter a nota derrubada por algo que ainda não era devido |
| D3 | Sequência limitada à janela de 30 dias | Sequência usa o **histórico inteiro** (até 3 anos) | Uma sequência de 45 dias aparecia como 30 |
| D4 | Dias da semana aceitos em duas convenções ao mesmo tempo (0 = domingo **ou** 0 = segunda) | Só 0 = domingo (convenção do domínio) | No legado o dia `1` valia segunda **e** terça |
| D5 | `weekly` virava diário na prática | `weekly_count` gera **uma ocorrência por semana**; sequência em semanas; semana de início só conta se cumprida | Contrato (`period`) e coerência: ninguém falha por não treinar numa terça |
| D6 | Espaçamento da regularidade medido em dias de calendário esperando 1 dia | Medido em **períodos previstos** | Um hábito de dias úteis seguido à risca era penalizado pelo fim de semana |
| D7 | Semana anterior sem dados tratada como 0% (hábito novo aparecia "melhorando +100") | Sem base de comparação: delta 0, estável | Evita elogio falso |
| D8 | Nota calculada com padrões (usuário novo recebia 47, "precisa de ajuste") | Menos de 3 períodos resolvidos: **sem nota** (`null`) | Não avaliar quem acabou de chegar |
| D9 | Progresso do dia = 0 quando nada era devido | `null` | "Nada previsto hoje" é diferente de "0% feito" |
| D10 | Arredondamento do NumPy (meio para o par) | Meio para longe do zero | Diferença só em empates exatos (ex.: 0,25) |
| D11 | Texto "Sábado-feira" e "Domingo-feira" | Nomes corretos dos dias | Erro de português |
| D12 | Vários alertas de gargalo semanal ao mesmo tempo | Só o dia mais concentrado | Menos ruído |
| D13 | `confiabilidade do registro` contava check-in de valor 0 como "registrado" | Passa a medir "teve algum progresso" (**cobertura**) | Todo registro agora tem valor > 0 (ver decisão A) |

## 3. Não portado, de propósito
- **Relatório "analítico" com janelas de 7/30/90 dias projetadas** (`completion * 0,95`, `score * 0,96` etc.) e a frase "eleva em 34% a durabilidade do hábito": eram números inventados apresentados como análise. As janelas agora são **calculadas** sobre os dados de cada período (`analysis.windows`).
- **`score_series` simulada** (trajetória fabricada a partir da nota e da tendência). Uma série real exige recalcular a nota dia a dia; fica para quando houver uma tela que a use.
- **`generate_seed_checkins_for_profile`**: o serviço Python preenchia o passado de contas não "clean" com check-ins **sintéticos** (probabilidade por nome de usuário) e os somava às estatísticas reais. A engine nova nunca fabrica histórico.
- **`skipped_justified`, `late_done`, `status_override`**: o domínio atual não tem esses conceitos (decisão E).
- **Relatórios em 3 camadas e `highlights` em texto**: a engine devolve métricas e `Insight[]` estruturados; a composição de frases fica na camada de interface.

## 4. Decisões que precisam da sua avaliação
**A. Cobertura de registro dentro do score (15%).** Como todo registro agora tem valor > 0, "sem registro" e "falhou" são a mesma coisa; a cobertura virou quase uma repetição da taxa de conclusão (peso 30%). Recomendo **manter a fórmula como está por ora** (preserva os números do legado) e reavaliar com dados reais. Alternativa: redistribuir os 15% para conclusão e regularidade.

**B. Mínimo de 3 períodos resolvidos para ter nota.** Recomendo manter. Para um usuário de hábitos semanais isso significa 3 semanas.

**C. Semana começando na segunda-feira.** Já combinado com o Gemini; falta a sua confirmação. Mudar depois altera as sequências semanais e o `period`.

**D. Tarefas fora dos insights por padrão** (`kinds = ['habit']`). Tarefas pontuais não entram em sequência, regularidade nem nota. Recomendo manter; dá para incluí-las com `kinds: ['habit','task']`.

**E. Dia de folga justificado.** O legado excluía dias "justificados" da taxa. O domínio não tem esse conceito. Se você quer "pausar sem culpa" (viagem, doença), é preciso um conceito novo no schema (por exemplo, uma pausa por período ou um tipo de registro `skip`). Recomendo decidir antes da Fase 5.

**F. Quantos insights mostrar.** A engine devolve todos, ordenados (atenção, conquistas, informativos). Mostrar tudo contraria "sem sobrecarregar". Sugiro a interface mostrar no máximo 3 ou 4 por vez; o limite é decisão de produto/UX.

**G. Compromissos arquivados fora do histórico.** Arquivar um hábito remove o passado dele das sequências globais. Alternativa: incluí-los até a data em que foram arquivados (exige guardar a data de arquivamento, que hoje só existe como `updatedAt`).

## 5. O que ficou intocado
- **Engine Python (`engine/`)**: continua no lugar. O `server/index.js` (Express local) a chama (`python -m engine.cli`). Só pode ser movida para `_to_delete/` quando o `server/` for removido.
- **`src/utils/biometricsAndAnalytics.js`**: o front legado só usa dele a meta de água e o XP. A duplicata `calculateConsistencyScore` só é chamada pelo teste legado. Sai quando a Fase 3 trocar as telas.
- Nenhuma tela do front foi alterada.

## 6. Como usar
```ts
import { analyze, weeklyPeriod } from 'src/domain/engine';

const a = analyze({ commitments, entries, today: '2026-11-14', timezone: 'America/Sao_Paulo' });
a.summary.consistencyScore; // number | null
a.insights;                 // Insight[] ordenados
```
`weeklyPeriod(commitment, dailyTotals, date)` devolve o `period` do `GET /api/v1/day` (Fase 3).
