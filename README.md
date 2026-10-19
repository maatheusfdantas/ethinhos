# Ethos — Sistema em Nuvem de Hábitos e Produtividade

Aplicação Web nativa (PWA / Desktop) para rastreamento de hábitos, gestão de rotina, foco pomodoro com proteção anti-fraude, telemetria de saúde e rede social gamificada.

---

## 🚀 Tecnologias Utilizadas

- **Framework:** React 19 + Vite
- **Ícones Vetoriais:** [Lucide Icons](https://lucide.dev/) (Diretriz: **Zero Emojis**, 100% SVG vetorial profissional)
- **Efeitos Visuais:** Canvas Confetti + HTML5 Canvas Rendering
- **Design System:** Vanilla CSS com Dark Mode nativo (`#070b12`), acentos em Ciano Vibrante (`#00e5ff`) e Índigo Suave (`#818cf8`), superfícies elevadas e border-radius elevado (`16px` a `24px` e pills).
- **Persistência:** LocalStorage Sync Service.

---

## 📋 Histórias de Usuário Implementadas (MVP Completo)

### 1. Fundação e Acesso (CRUD Básico)
- **US35:** Cadastro e login de usuário com e-mail e senha.
- **US36:** Recuperação de senha via token simulado no e-mail (código de 6 dígitos) com validação e redefinição.
- **US37:** Configuração de perfil (Público/Privado) para controle de privacidade no Feed Social.

### 2. Gestão de Rotina e Tarefas
- **US01:** Cadastro de tarefas diárias com nível de esforço (*Baixo, Médio, Alto*) e conclusão rápida.
- **US02:** Barra de progresso diária (0-100%) atualizada em tempo real.
- **US19:** Configuração de repetição de tarefas com seletores circulares de dias da semana (*S, T, Q, Q, S, S, D*).
- **US20:** Categorização por prioridade (*Alta, Média, Baixa*) com ordenação automática (prioridade alta no topo).
- **US39:** Tags de cores (*Faculdade, Casa, Trabalho, Saúde*) para categorizar atividades.

### 3. Foco e Produtividade (Lógica de Tempo)
- **US05:** Cronômetro de foco ajustável (Técnica Pomodoro: presets de 15 a 60 min).
- **US06:** Geração dinâmica de imagem comemorativa via HTML5 Canvas ao finalizar o foco (download PNG e compartilhamento no Feed).
- **US24:** Função de pausar e retomar com limite de tempo de pausa (regra de negócio anti-fraude com contagem regressiva).
- **US25:** Vinculação da sessão de foco a uma matéria específica (ex: *Sistemas Operacionais*).

### 4. Saúde e Recuperação (Inputs Rápidos)
- **US09:** Botão `+` para registrar copos de água (+250ml cada).
- **US27:** Botão `-` para deletar o último copo de água inserido (correção de erro do usuário).
- **US10:** Registro manual do ciclo de sono (horário que dormiu e acordou, cálculo de horas dormidas).
- **US11:** Cadastro simples de treino de musculação ou atividade física concluída.

### 5. Telemetria e Dashboards (Consultas Complexas/Gráficos)
- **US12:** Cálculo diário da Média de Vitalidade (cruzando *40% tarefas + 30% água + 30% sono*).
- **US04:** Calendário Matriz mensal (mapa de calor estilo GitHub / heat matrix dos dias produtivos com dots coloridos).
- **US13:** Dashboard de estatísticas semanais (gráficos de barras comparando a semana atual com a anterior).

### 6. Gamificação e Rede Social
- **US16:** Desbloqueio de Conquistas/Badges (*Guardião da Constância*, *Mestre da Hidratação*, *Foco Inabalável*, etc.).
- **US32:** Sistema de amizades (Buscar usuário, enviar solicitação e aceitar/recusar relacionamento N:N).
- **US14:** Feed Social com apenas os eventos de conclusão dos amigos aprovados.
- **US15:** Reações vetorizadas com botões de curtir/reagir (*Curtir, Fogo, Troféu* — sem emojis).

---

## 🛠️ Como Rodar Localmente

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Iniciar o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

3. **Acessar no navegador:**
   Abra [http://localhost:5173](http://localhost:5173).

4. **Gerar build de produção:**
   ```bash
   npm run build
   ```
