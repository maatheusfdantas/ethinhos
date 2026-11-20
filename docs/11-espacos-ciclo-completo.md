# Espaços profissionais: ciclo completo (planejar → atribuir → executar → registrar → acompanhar → atualizar)

Data: 20/11/2026. Base: `origin/main` @ `5689993` (produção, deploy `e3c7a2fa`) + correções A–D locais (`b4ba5b2`, `4e9ea24`).
Complementa `docs/10-espacos-profissionais.md`; onde houver conflito, este documento vale.
**Nada desta especificação está implementado.** Prévia isolada: `D:\Codes\Ethos-design\proposta-06-ciclo\`.

## 1. Diagnóstico (o que existe de fato no código)

### Em produção
| Área | Situação | Onde |
|---|---|---|
| Perfil profissional | Admin ativa, suspende, reativa e troca o modelo (Personal, Nutri, Clínica). Um perfil por conta. | `functions/api/_routes/espacos.js`, `AdminProfissionais.jsx`, migração 0009 |
| Espaço, turmas, convites | Um espaço por profissional; turmas; código de turma de 24 h com vários usos (só o hash no banco); convite individual de uso único; revogar; entrar exige maioridade | mesmos arquivos, `EspacosTab.jsx`, `ProEspaco.jsx` |
| Vínculo e participação | Separados: sair da turma não encerra o vínculo; encerrar o vínculo encerra as turmas | tabelas `space_links`, `group_members` |
| Treino da pessoa | Treino redesenhado; treino ativo guiado com sessões e séries no servidor, retomável, sem duplicar, finalizar parcial, +50 pts | `src/components/treino/*`, `_routes/treino.js`, migração 0008 |
| Permissões | O servidor confere perfil ativo, espaço e vínculo a cada pedido; o admin não lê dados das pessoas | `espacos.js`, `_lib/guard.js` |

### Não existe ainda (o que este plano cobre)
- **Atribuição** de ficha ou programa a uma pessoa ou turma, nem cópia individual, nem versões de ficha do profissional.
- **Visão do profissional sobre a execução**: ele não vê as sessões de quem acompanha.
- **Área individual** (acompanhamento restrito de uma pessoa) e a **página da turma** com atribuições, agenda e avisos.
- **Agenda do espaço**: eventos com convite, aceite, recusa, cancelamento e presença.
- **Avisos e comentários privados**.
- **Pendências** (central de convites e avisos), sem notificação repetida.
- **Alimentação**: plano estruturado, publicação, versões e registro do paciente.
- **Clínica**: pendências administrativas.
- **Separação por modelo**: hoje os três modelos têm as mesmas telas (turmas e pessoas). Falta a regra "Personal não acessa alimentação, Nutri não acessa treino, Clínica não acessa nenhum dos dois".

### Riscos encontrados
1. **Hábito ligado ao treino:** o check-in do hábito "Treinar" ao concluir o treino ainda não existe. Ele depende do registro diário de hábitos (Q5 da auditoria), que também não foi feito. Sem isso, "integrar com hábito sem duplicação" fica para o lote D2b.
2. **Categorias globais em produção (B):** o código não cria nenhuma, mas, se houver linhas com `user_id = 'global'` no banco, elas aparecem para todos. Para saber, é preciso uma **consulta só de leitura** em produção, que depende da sua autorização. Não removo nada sem mostrar antes.
3. **Hábitos e eventos antigos** com categoria "Faculdade" (padrão anterior do formulário) continuam com esse texto. Não altero dados em massa sem a sua aprovação.
4. **Comportamentos legados não cobertos** por este pacote: a **sincronização dos maus hábitos** (F3) e a **recorrência da agenda** (F5) da auditoria.

## 2. Correções A–D (feitas, locais, não publicadas)
| | Causa encontrada | Correção | Teste |
|---|---|---|---|
| **A. Água** | `health` guardava um único número sem data; nada zerava; o cache local e a sincronização mantinham o valor | O valor passa a levar o dia local (`water_date`, migração 0010, só acrescenta). O app começa o dia em 0 ao carregar, no cache e na virada da meia-noite. Copos do dia anterior não entram no novo | `tests/api/correcoes-ad.test.ts`, `src/__tests__/correcoes.test.jsx`, e2e local (servidor e cache com 4 copos do dia 17 → hoje 0 → 1 copo grava 1 com a data de hoje → recarregar mantém) |
| **B. Categorias** | O modal de evento da Agenda mostrava uma lista fixa e ignorava as categorias da conta; o modal "Novo" fazia o mesmo sem categorias (correção de 15/11 nunca publicada) | Só as categorias da conta; sem nenhuma, aparece o aviso. A lista fixa fica só como paleta de cores | testes de tela + e2e |
| **C. Validação** | O servidor só tirava `<` e `>` (`<b>Oi</b>` virava `bOi/b`); não havia regra por campo | `src/domain/validation.js`, usado pela tela e pelo servidor: nome, e-mail, telefone, código, número, data, horário, cor e texto livre. Aplicado no cadastro, perfil, hábitos, eventos, sincronização, saúde, categorias e lista de espera. O limpador global tira a tag inteira | 8 testes de servidor + 5 de regra |
| **D. Admin em amizades** | Busca, sugestões e pedido de conexão não olhavam o papel da conta | O servidor exclui contas admin da busca, das sugestões e do pedido (por @ ou id, responde 404). Conexões antigas ficam ocultas, sem apagar | 3 testes + e2e |

**Limites:** os testes usam um banco SQLite falso e um banco local do wrangler, não o D1 real. A virada da meia-noite foi testada pela regra (relógio simulado), não com o app aberto às 0h.

## 3. Decisões (já respondidas por você em 18/11; confirme ou mude)
| # | Pendência | Decisão registrada |
|---|---|---|
| 1 | Entrada após o código | **Imediata**, depois da confirmação e da declaração de maioridade |
| 2 | Mais de um modelo por conta | **Não**: um modelo por conta |
| 3 | Clínica | **Um responsável** (sem equipe nem recepção na v1) |
| 4 | Bioimpedância | **Adiada** (exige escopo próprio de dado de saúde) |
| 5 | Progresso alimentar | **Dois números separados**: registro do dia (registradas ÷ previstas) e relação com o plano (só contagens, sem nota) |
| 6 | Plano ou vínculo encerrado | **Paciente mantém** tudo, só leitura; **profissional perde** o acesso aos dados da pessoa |
| 7 | Menores de idade | **Fora da v1** (declaração de 18+ ao entrar) |
| 8 | Convite vencido ou evento alterado | Pendência **some no início do evento** ("sem resposta"); mudança de data ou horário **volta a pendente** |
| 9 | Vínculo sem turma | **Convite individual** de uso único, válido por 24 h (já implementado) |

**Nova, precisa de resposta:**
- **N1.** Atribuir para uma **turma** cria uma cópia por pessoa (cada uma pode ser adaptada sem afetar os colegas)? **Recomendo sim**: é o que garante "adaptação individual não altera os colegas".

## 4. Matriz de permissões (servidor; negado por padrão)
Legenda: ✔ permitido · ✖ negado · **V** só dentro do próprio espaço e de vínculos ativos.

| Recurso | Admin | Personal | Nutri | Clínica | Pessoa | Outra pessoa |
|---|---|---|---|---|---|---|
| Perfis profissionais (aprovar, suspender, modelo) | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ |
| Turmas, convites, pessoas, encerrar vínculo | ✖ | V | V | V | sair ou encerrar o próprio | ✖ |
| Fichas, programas, versões, atribuir treino | ✖ | V | ✖ | ✖ | ✖ | ✖ |
| Sessões e séries do treino **atribuído** | ✖ | V (só das atribuições dele) | ✖ | ✖ | ✔ as próprias | ✖ |
| Treinos **próprios** da pessoa | ✖ | ✖ | ✖ | ✖ | ✔ | ✖ |
| Planos alimentares, publicar, versões | ✖ | ✖ | V | ✖ | ver os destinados a ela | ✖ |
| Registros de refeição do plano | ✖ | ✖ | V | ✖ | ✔ os próprios | ✖ |
| Eventos do espaço (criar, alterar, cancelar, presença) | ✖ | V | V | V | aceitar ou recusar os próprios | ✖ |
| Avisos (publicar) | ✖ | V | V | V | ✖ | ✖ |
| Comentário em aviso | ✖ | V (conversa com cada pessoa) | V | V | só a própria conversa | ✖ |
| Pendências administrativas | ✖ | ✖ | ✖ | V | ✖ | ✖ |
| Hábitos, notas, foco, saúde, agenda pessoal, Spotify | ✖ | ✖ | ✖ | ✖ | ✔ | ✖ |

**Regras de execução:**
- Uma função única de acesso (`_lib/espacos-acesso.js`) confere, a cada pedido, o perfil ativo, o **modelo**, o espaço, o vínculo e se o objeto pertence a esse espaço.
- Suspensão e encerramento de vínculo valem no próximo pedido.
- Campos `role`, `owner`, `spaceId` e `clientId` enviados pelo navegador nunca dão acesso.
- A rota do modelo errado responde 403. Exemplo: Nutri chamando rota de ficha.

## 5. Estrutura (separação pedida)
conta → **perfil profissional** (1 por conta, com modelo) → **espaço** (1) → **turmas** (várias) · **vínculo individual** (1 ativo por espaço e pessoa) → **participação** (pessoa em turma) · **atribuição** (o que o profissional deu à pessoa, com origem: individual ou turma) → **registro de execução** (sessão de treino ou registro de refeição, sempre da pessoa).

**Regras da estrutura:**
- Entrar em várias turmas do mesmo espaço: **um único vínculo** (índice único parcial, já implementado).
- Sair da turma: encerra só a participação. Atribuições vindas da turma ficam marcadas como "da turma, encerrada", e a pessoa mantém o que já fez.

## 6. Fluxos
1. **Atribuir (Personal).**
   1. Na turma ou na área individual, o profissional escolhe "Atribuir ficha" e escolhe a ficha e a versão.
   2. A prévia mostra quem recebe ("8 pessoas da turma Força") e o que muda.
   3. Ele confirma. O servidor cria uma atribuição por pessoa, com cópia do conteúdo, origem e autor, num batch idempotente. Repetir não duplica.
   4. A pessoa vê a ficha em "Do seu personal" no Treino.
2. **Adaptar para uma pessoa.**
   1. Na área individual, ele abre a atribuição e edita a cópia.
   2. A cópia ganha uma nova versão só daquela pessoa, e os colegas não mudam.
3. **Nova versão da ficha.**
   1. O profissional publica a versão N+1 e escolhe quem recebe: todos, alguns ou só atribuições novas.
   2. Cópias adaptadas não são substituídas sem confirmação. Sessões já feitas não mudam.
4. **Executar.**
   1. A pessoa inicia pelo modo guiado que já existe; a sessão guarda o `assignment_id`.
   2. O resumo mostra o planejado e o realizado por exercício.
5. **Acompanhar.**
   1. A área individual mostra a semana da pessoa: dias treinados, sessões, planejado e realizado.
   2. A visão geral do espaço lista o que pede ação: pessoas sem atribuição, registros novos desde a última visita, convites de evento sem resposta.
6. **Plano alimentar (Nutri).**
   1. Rascunho no editor estruturado, depois "ver como o paciente vai ver", depois publicar com data de início.
   2. A aba Alimentação do paciente desbloqueia.
   3. O paciente registra cada refeição como conforme, alternativa autorizada, parcial, diferente ou não realizada.
   4. A Nutri vê a semana do paciente e publica uma nova versão quando quiser.
   5. Encerrar um plano o deixa só para leitura.
7. **Evento.**
   1. O profissional cria um evento para a turma, para pessoas ou para o espaço.
   2. Cada convidado recebe uma pendência, sem notificação repetida (chave única).
   3. **Aceitar:** a agenda mostra uma referência ao evento, sem cópia.
   4. **Recusar:** a pendência some.
   5. **Mudar data ou horário:** volta a pendente.
   6. **Cancelar:** aparece riscado.
   7. **Pendência vencida:** some no início do evento.
   8. **Presença** é marcada à parte, depois do evento.
8. **Aviso.**
   1. O profissional publica para a turma, para pessoas ou para o espaço; os destinatários ficam fixados na publicação.
   2. A pessoa lê e, se o aviso permitir, comenta. O comentário é privado: só ela e o profissional veem.
   3. Não há confirmação de leitura obrigatória nem chat.
9. **Saída.**
   - **Sair da turma** encerra só a participação.
   - **Encerrar o vínculo** tira o acesso do profissional na hora. A pessoa mantém atribuições, planos e registros, só para leitura.

## 7. Modelo de dados (migrações 0011+; só acrescentam)
| Tabela | Campos principais | Integridade |
|---|---|---|
| `pro_templates` | `id`, `space_id`, `kind` (ficha / programa), `name`, `status`, `current_version` | do espaço |
| `pro_template_versions` | `template_id`, `version`, `content_json`, `created_by`, `created_at` | imutável; UNIQUE (`template_id`, `version`) |
| `assignments` | `id`, `space_id`, `link_id`, `client_id`, `kind` (treino / plano), `source_template_id`, `source_version`, `group_id` NULL, `content_json`, `version`, `allow_client_edit` NULL, `status` (ativa / encerrada), `created_by`, `created_at` | UNIQUE (`space_id`, `client_id`, `source_template_id`, `group_id`) WHERE ativa (idempotente) |
| `assignment_versions` | `assignment_id`, `version`, `content_json`, `author_id`, `created_at` | histórico de adaptações |
| `workout_sessions` | + `assignment_id` (coluna já existe na 0008) | a sessão congela o conteúdo |
| `meal_plans` / `meal_plan_versions` | plano por paciente; versões imutáveis; `starts_on`, `ends_on`, `status` (rascunho / publicado / vigente / substituído / encerrado) | 1 vigente por paciente e espaço |
| `meal_logs` | `client_id`, `plan_version_id`, `date`, `meal_key`, `status`, `option_key`, `substitution`, `note` | UNIQUE (`client_id`, `plan_version_id`, `date`, `meal_key`) |
| `space_events` / `space_event_invites` | evento com `version`; convite (pendente / aceito / recusado / expirado / cancelado), `answered_version`, `attendance` | UNIQUE (`event_id`, `user_id`) |
| `space_posts` / `space_post_recipients` / `space_post_comments` | aviso, destinatários fixados, conversa por (`post_id`, `participant_id`) | — |
| `notifications` | `user_id`, `type`, `ref_id`, `dedupe_key` UNIQUE, `read_at` | sem repetição |
| `space_tasks` | pendências da Clínica | do espaço |

**Regras gerais:**
- Toda listagem tem paginação (`LIMIT` + cursor).
- Toda escrita confere o dono.
- Ids gerados no navegador nas operações repetíveis.
- Exclusão de conta: lista única em `_lib/erase.js`.
- **Reversão:** o código antigo ignora as tabelas novas; para voltar, rollback do deploy e restauração do D1 (bookmark registrado antes).

## 8. Telas e navegação (prévia 06)
| Nível | Personal | Nutri | Clínica |
|---|---|---|---|
| **Espaço · Visão geral** | ações: sem atribuição, registros novos, convites sem resposta, próximos eventos; cada número abre a lista | sem plano publicado, registros novos, planos que vencem | convites sem resposta, próximos eventos, pendências administrativas |
| **Turma** | abas: Participantes · Atribuições · Agenda · Avisos | Participantes · Planos · Agenda · Avisos | Participantes · Agenda · Avisos |
| **Área individual** | Planejamento (atribuições e adaptação) · Registros (semana, sessões, planejado e realizado) · Agenda · Acesso | Plano · Registros da semana · Agenda · Acesso | Agenda · Avisos · Acesso |
| **Conteúdo** | Fichas e programas (versões) | Planos alimentares | — |

**Pessoa:**
- Treino ("Do seu personal");
- Alimentação (só com plano publicado);
- Agenda (eventos aceitos, com selo do espaço);
- Pendências (sino no topo e aviso discreto no Painel);
- Espaços.

## 9. Testes (cada regra com um teste; sem depender só de mock)
- **Autorização:** cada célula da matriz; o modelo errado leva 403; profissional suspenso; vínculo encerrado; ids de outro espaço.
- **Atribuição:**
  - idempotente (repetir não duplica);
  - para a turma, uma cópia por pessoa;
  - adaptar uma cópia não muda as outras;
  - versão nova não substitui a adaptada sem confirmar;
  - sessão com `assignment_id` visível só para o profissional dono.
- **Alimentação:**
  - a aba só aparece com plano publicado;
  - o plano futuro não vale ainda;
  - fórmulas dos dois números;
  - refeição extra fora do denominador;
  - histórico depois de nova versão.
- **Eventos:**
  - aceitar sem duplicar;
  - mudar horário volta a pendente;
  - cancelar;
  - fuso horário;
  - pendência vencida;
  - pendência sem repetir.
- **Avisos:** a conversa é privada (um colega não lê); destinatários fixados.
- **Tela:**
  - e2e no servidor local com o backend real (wrangler e D1 local), desktop e celular;
  - estados vazio, carregando e erro;
  - comparação com as prévias.
- **Limites declarados:** sem D1 remoto nos testes; sem testes de carga.

## 10. Lotes (cada um: worktree, escopo, testes, e2e local, commit local; push, deploy e migração só com autorização)
| Lote | Entrega | Arquivos principais | Aceite |
|---|---|---|---|
| **0. Correções A–D** (feito, local) | água, categorias, validação, admin | ver seção 2 | 365 testes; e2e local |
| **D2a. Modelo por permissão + fichas do profissional** | função de acesso com modelo; fichas e programas com versões | `_lib/espacos-acesso.js`, `_routes/espacos-treino.js`, migração 0011, `ProEspaco` (Conteúdo) | matriz por modelo coberta; versões imutáveis |
| **D2b. Atribuir, executar, acompanhar** | atribuir a pessoa ou turma; cópia individual; "Do seu personal" no Treino; área individual com registros; visão geral com ações | `espacos-treino.js`, `TreinoTab` (seção), `ProEspaco` (turma, individual) | fluxos 1 a 5; idempotência; privacidade |
| **C. Agenda, avisos, pendências** | eventos com aceite; avisos e comentários privados; central de pendências | `_routes/espacos-agenda.js`, `CalendarTab` (referências só de leitura), `Pendencias.jsx` | fluxos 7 e 8 |
| **E. Nutri** | editor de plano, publicação, versões; Alimentação do paciente; registros | `_routes/alimentacao.js`, `src/components/alimentacao/*` | fluxo 6; fórmulas |
| **F. Clínica** | pendências administrativas; visão geral da Clínica | `espacos.js` (tarefas), `ProEspaco` | só organização |

## 11. Dependências e custos
- **Nenhuma dependência nova.**
- **D1 e Functions atuais:** o desenho evita consultas em série (N+1) e usa `batch`.
- **Pendências só dentro do app:** sem push e sem e-mail, porque o Resend continua adiado.
