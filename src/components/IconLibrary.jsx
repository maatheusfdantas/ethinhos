import React, { useState, useMemo } from 'react';
import {
  // Estudos & Intelecto
  BookOpen,
  Bookmark,
  GraduationCap,
  PenTool,
  Lightbulb,
  Library,
  FileText,
  Languages,
  Brain,
  Calculator,
  Microscope,
  Atom,
  Award,
  Newspaper,
  // Trabalho & Carreira
  Briefcase,
  Laptop,
  Target,
  Compass,
  BarChart3,
  CheckSquare,
  Presentation,
  FolderKanban,
  ClipboardList,
  Send,
  Mail,
  Users,
  Rocket,
  Megaphone,
  // Tecnologia & Código
  Code,
  Terminal,
  Cpu,
  Layers,
  Database,
  Server,
  Shield,
  Lock,
  Bug,
  GitBranch,
  Wifi,
  Cloud,
  Smartphone,
  Bot,
  // Saúde, Treino & Esporte
  Dumbbell,
  Activity,
  Heart,
  Flame,
  Droplets,
  Footprints,
  Apple,
  Timer,
  Bike,
  Trophy,
  Medal,
  HeartPulse,
  Pill,
  Stethoscope,
  // Mente, Foco & Bem-Estar
  Smile,
  Sparkles,
  Sun,
  Moon,
  Eye,
  Wind,
  Feather,
  Flower2,
  Leaf,
  Sunrise,
  Sunset,
  Infinity,
  Anchor,
  Zap,
  // Rotina, Casa & Organização
  Home,
  Clock,
  Calendar,
  Bell,
  ShieldCheck,
  Key,
  ShoppingBag,
  ShoppingCart,
  Utensils,
  Bed,
  Bath,
  Car,
  Plane,
  MapPin,
  // Finanças & Negócios
  Wallet,
  CreditCard,
  DollarSign,
  TrendingUp,
  PiggyBank,
  Landmark,
  Receipt,
  Coins,
  Percent,
  Gem,
  ChartPie,
  Banknote,
  ArrowUpRight,
  Scale,
  // Lazer, Arte & Cultura
  Coffee,
  Music,
  Palette,
  Camera,
  Gamepad2,
  Globe,
  Headphones,
  Film,
  Tv,
  Mic,
  Guitar,
  Clapperboard,
  Tent,
  Ticket,
  // UI Auxiliares
  Search,
  Check
} from 'lucide-react';

// =====================================================================
// PALETA EXPANDIDA DE CORES PARA CATEGORIAS MODULARES (24 CORES + CUSTOM)
// =====================================================================
export const CATEGORY_COLOR_PALETTE = [
  // Família Índigo, Azul & Ciano
  { name: 'Índigo Real', family: 'Foco & Intelecto', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' },
  { name: 'Índigo Suave', family: 'Foco & Intelecto', color: '#818cf8', bg: 'rgba(129, 140, 248, 0.15)' },
  { name: 'Azul Oceano', family: 'Foco & Intelecto', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  { name: 'Azul Celeste', family: 'Foco & Intelecto', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.15)' },
  { name: 'Ciano Elétrico', family: 'Foco & Intelecto', color: '#00e5ff', bg: 'rgba(0, 229, 255, 0.15)' },
  { name: 'Turquesa Deep', family: 'Foco & Intelecto', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },

  // Família Verde, Esmeralda & Menta
  { name: 'Esmeralda Viva', family: 'Saúde & Equilíbrio', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  { name: 'Menta Fresca', family: 'Saúde & Equilíbrio', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)' },
  { name: 'Verde Floresta', family: 'Saúde & Equilíbrio', color: '#059669', bg: 'rgba(5, 150, 105, 0.15)' },
  { name: 'Verde Lima', family: 'Saúde & Equilíbrio', color: '#84cc16', bg: 'rgba(132, 204, 22, 0.15)' },
  { name: 'Teal Sereno', family: 'Saúde & Equilíbrio', color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.15)' },
  { name: 'Oliva Natural', family: 'Saúde & Equilíbrio', color: '#65a30d', bg: 'rgba(101, 163, 13, 0.15)' },

  // Família Violeta, Roxo & Magenta
  { name: 'Violeta Imperial', family: 'Criatividade & Mente', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  { name: 'Roxo Ametista', family: 'Criatividade & Mente', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' },
  { name: 'Fúcsia Vibrante', family: 'Criatividade & Mente', color: '#d946ef', bg: 'rgba(217, 70, 239, 0.15)' },
  { name: 'Rosa Choque', family: 'Criatividade & Mente', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
  { name: 'Lavanda Escura', family: 'Criatividade & Mente', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.15)' },
  { name: 'Orquídea', family: 'Criatividade & Mente', color: '#c026d3', bg: 'rgba(192, 38, 211, 0.15)' },

  // Família Coral, Vermelho, Laranja & Ouro
  { name: 'Rosa Rubi', family: 'Energia & Ação', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
  { name: 'Vermelho Carmim', family: 'Energia & Ação', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  { name: 'Laranja Solar', family: 'Energia & Ação', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' },
  { name: 'Âmbar Dourado', family: 'Energia & Ação', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  { name: 'Ouro Amarelo', family: 'Energia & Ação', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)' },
  { name: 'Grafite Neutro', family: 'Energia & Ação', color: '#475569', bg: 'rgba(71, 85, 105, 0.15)' }
];

// =====================================================================
// GRUPOS DE ÍCONES SEPARADOS POR TEMA (8 CATEGORIAS BEM DEFINIDAS)
// =====================================================================
export const CLEAN_ICON_GROUPS = [
  { id: 'all', label: 'Todos (Separados)', badgeColor: '#4F46E5' },
  { id: 'estudos', label: 'Estudos & Intelecto', badgeColor: '#3B82F6' },
  { id: 'trabalho', label: 'Trabalho & Carreira', badgeColor: '#6366F1' },
  { id: 'tecnologia', label: 'Tecnologia & Código', badgeColor: '#0EA5E9' },
  { id: 'saude', label: 'Saúde & Treino', badgeColor: '#10B981' },
  { id: 'mente', label: 'Mente & Bem-Estar', badgeColor: '#8B5CF6' },
  { id: 'rotina', label: 'Rotina & Casa', badgeColor: '#F59E0B' },
  { id: 'financas', label: 'Finanças & Negócios', badgeColor: '#059669' },
  { id: 'lazer', label: 'Lazer & Cultura', badgeColor: '#EC4899' }
];

export const CLEAN_ICONS_COLLECTION = [
  // --- 1. ESTUDOS & INTELECTO (14 ÍCONES) ---
  { id: 'BookOpen', name: 'Livro Aberto', group: 'estudos', keywords: 'estudo caderno aula leitura materia', Icon: BookOpen },
  { id: 'GraduationCap', name: 'Faculdade / Diploma', group: 'estudos', keywords: 'universidade curso diploma formacao', Icon: GraduationCap },
  { id: 'Bookmark', name: 'Marcador / Leitura', group: 'estudos', keywords: 'marcador livro capitulo texto', Icon: Bookmark },
  { id: 'PenTool', name: 'Caneta / Redação', group: 'estudos', keywords: 'escrita redacao anotacoes desenho', Icon: PenTool },
  { id: 'Lightbulb', name: 'Ideias / Insight', group: 'estudos', keywords: 'ideia solucao criatividade pensamento', Icon: Lightbulb },
  { id: 'FileText', name: 'Artigo / Resumo', group: 'estudos', keywords: 'artigo resumo pdf documento', Icon: FileText },
  { id: 'Library', name: 'Biblioteca / Acervo', group: 'estudos', keywords: 'biblioteca livros materias estante', Icon: Library },
  { id: 'Languages', name: 'Idiomas / Línguas', group: 'estudos', keywords: 'ingles linguas conversacao vocabulario', Icon: Languages },
  { id: 'Brain', name: 'Cognição / Memória', group: 'estudos', keywords: 'cerebro memoria raciocinio logica', Icon: Brain },
  { id: 'Calculator', name: 'Cálculo / Exatas', group: 'estudos', keywords: 'matematica calculo fisica numeros', Icon: Calculator },
  { id: 'Microscope', name: 'Pesquisa / Ciência', group: 'estudos', keywords: 'laboratorio ciencia biologia quimica', Icon: Microscope },
  { id: 'Atom', name: 'Física / Engenharia', group: 'estudos', keywords: 'atomo fisica quimica ciencia', Icon: Atom },
  { id: 'Award', name: 'Certificação / Prova', group: 'estudos', keywords: 'certificado concurso exame conquista', Icon: Award },
  { id: 'Newspaper', name: 'Leitura Diária / News', group: 'estudos', keywords: 'jornal noticias atualidades artigos', Icon: Newspaper },

  // --- 2. TRABALHO & CARREIRA (14 ÍCONES) ---
  { id: 'Briefcase', name: 'Maleta / Carreira', group: 'trabalho', keywords: 'carreira escritorio emprego empresa', Icon: Briefcase },
  { id: 'Laptop', name: 'Notebook / Remoto', group: 'trabalho', keywords: 'notebook tech trabalho computador', Icon: Laptop },
  { id: 'Target', name: 'Alvo / Metas OKR', group: 'trabalho', keywords: 'meta foco objetivo precisao', Icon: Target },
  { id: 'Compass', name: 'Estratégia / Direção', group: 'trabalho', keywords: 'direcao planejamento visao', Icon: Compass },
  { id: 'BarChart3', name: 'Relatórios / KPIs', group: 'trabalho', keywords: 'analise dados estatisticas vendas', Icon: BarChart3 },
  { id: 'CheckSquare', name: 'Checklist / Entregas', group: 'trabalho', keywords: 'tarefas to do entregas concluido', Icon: CheckSquare },
  { id: 'Presentation', name: 'Reunião / Pitch', group: 'trabalho', keywords: 'apresentacao slides reuniao palestra', Icon: Presentation },
  { id: 'FolderKanban', name: 'Gestão / Kanban', group: 'trabalho', keywords: 'projetos quadros scrum organizacao', Icon: FolderKanban },
  { id: 'ClipboardList', name: 'Planejamento / Pauta', group: 'trabalho', keywords: 'lista escopo etapas revisao', Icon: ClipboardList },
  { id: 'Send', name: 'Envio / Follow-up', group: 'trabalho', keywords: 'proposta envio cliente mensagem', Icon: Send },
  { id: 'Mail', name: 'E-mails / Inbox Zero', group: 'trabalho', keywords: 'email caixa entrada comunicacao', Icon: Mail },
  { id: 'Users', name: 'Equipe / Liderança', group: 'trabalho', keywords: 'time clientes networking pessoas', Icon: Users },
  { id: 'Rocket', name: 'Lançamento / Startup', group: 'trabalho', keywords: 'crescimento foguete produto escala', Icon: Rocket },
  { id: 'Megaphone', name: 'Marketing / Divulgação', group: 'trabalho', keywords: 'comunicacao redes anuncio campanha', Icon: Megaphone },

  // --- 3. TECNOLOGIA & CÓDIGO (14 ÍCONES) ---
  { id: 'Code', name: 'Código / Dev', group: 'tecnologia', keywords: 'desenvolvimento software dev programar', Icon: Code },
  { id: 'Terminal', name: 'Terminal / CLI', group: 'tecnologia', keywords: 'devops comandos terminal linux shell', Icon: Terminal },
  { id: 'Cpu', name: 'Hardware / Sistemas', group: 'tecnologia', keywords: 'processador chip circuitos arquitetura', Icon: Cpu },
  { id: 'Layers', name: 'Full-Stack / Camadas', group: 'tecnologia', keywords: 'arquitetura estrutura design system', Icon: Layers },
  { id: 'Database', name: 'Banco de Dados / SQL', group: 'tecnologia', keywords: 'sql dados banco tabelas storage', Icon: Database },
  { id: 'Server', name: 'Infra / Cloud Server', group: 'tecnologia', keywords: 'servidor deploy backend api', Icon: Server },
  { id: 'Shield', name: 'Cibersegurança / Sec', group: 'tecnologia', keywords: 'seguranca pentest firewall defesa', Icon: Shield },
  { id: 'Lock', name: 'Criptografia / Auth', group: 'tecnologia', keywords: 'senha privacidade acesso token', Icon: Lock },
  { id: 'Bug', name: 'Debug / QA Testes', group: 'tecnologia', keywords: 'erro correcao testes bug bounty', Icon: Bug },
  { id: 'GitBranch', name: 'Git / Versionamento', group: 'tecnologia', keywords: 'git github commit branch pull request', Icon: GitBranch },
  { id: 'Wifi', name: 'Redes / Conectividade', group: 'tecnologia', keywords: 'rede protocolo internet wireless', Icon: Wifi },
  { id: 'Cloud', name: 'Cloud Computing', group: 'tecnologia', keywords: 'nuvem aws cloudflare infraestrutura', Icon: Cloud },
  { id: 'Smartphone', name: 'Mobile / Apps', group: 'tecnologia', keywords: 'celular android ios aplicativo', Icon: Smartphone },
  { id: 'Bot', name: 'IA / Automação', group: 'tecnologia', keywords: 'inteligencia artificial agente robo llm', Icon: Bot },

  // --- 4. SAÚDE, TREINO & ESPORTE (14 ÍCONES) ---
  { id: 'Dumbbell', name: 'Musculação / Academia', group: 'saude', keywords: 'academia treino musculacao exercicio', Icon: Dumbbell },
  { id: 'Activity', name: 'Cardio / Batimentos', group: 'saude', keywords: 'batimento cardio pulso corrida', Icon: Activity },
  { id: 'Heart', name: 'Saúde Cardiovascular', group: 'saude', keywords: 'vida saude vitalidade corpo', Icon: Heart },
  { id: 'Flame', name: 'Queima Calórica / HIIT', group: 'saude', keywords: 'calorias fogo metabolismo intensidade', Icon: Flame },
  { id: 'Droplets', name: 'Hidratação / Água', group: 'saude', keywords: 'agua hidratacao liquido beber', Icon: Droplets },
  { id: 'Footprints', name: 'Caminhada / Passos', group: 'saude', keywords: 'passos caminhada corrida movimento', Icon: Footprints },
  { id: 'Apple', name: 'Nutrição / Dieta', group: 'saude', keywords: 'comida alimentacao dieta saudavel fruta', Icon: Apple },
  { id: 'Timer', name: 'Cronômetro / Descanso', group: 'saude', keywords: 'descanso serie tempo intervalo', Icon: Timer },
  { id: 'Bike', name: 'Ciclismo / Pedal', group: 'saude', keywords: 'bicicleta ciclismo esporte cardio', Icon: Bike },
  { id: 'Trophy', name: 'Recorde Pessoal (PR)', group: 'saude', keywords: 'trofeu campeao vitoria competicao', Icon: Trophy },
  { id: 'Medal', name: 'Atleta / Prova', group: 'saude', keywords: 'medalha maratona conquista podio', Icon: Medal },
  { id: 'HeartPulse', name: 'Check-up / Vitalidade', group: 'saude', keywords: 'monitoramento saude exame medico', Icon: HeartPulse },
  { id: 'Pill', name: 'Suplementos / Vitaminas', group: 'saude', keywords: 'creatina whey vitamina remedio', Icon: Pill },
  { id: 'Stethoscope', name: 'Consulta / Médico', group: 'saude', keywords: 'medico clinica saude prevencao', Icon: Stethoscope },

  // --- 5. MENTE, FOCO & BEM-ESTAR (14 ÍCONES) ---
  { id: 'Smile', name: 'Saúde Mental / Humor', group: 'mente', keywords: 'psicologia mente calma relaxamento', Icon: Smile },
  { id: 'Sparkles', name: 'Mindfulness / Clareza', group: 'mente', keywords: 'habito rotina organizacao autocuidado', Icon: Sparkles },
  { id: 'Sun', name: 'Energia Matinal', group: 'mente', keywords: 'sol despertar acordar manha', Icon: Sun },
  { id: 'Moon', name: 'Sono Reparador', group: 'mente', keywords: 'dormir descanso noite sono', Icon: Moon },
  { id: 'Eye', name: 'Foco / Atenção Plena', group: 'mente', keywords: 'visao concentracao observacao foco', Icon: Eye },
  { id: 'Wind', name: 'Respiração / Calma', group: 'mente', keywords: 'ar respirar ansiedade meditacao', Icon: Wind },
  { id: 'Feather', name: 'Diário / Gratidão', group: 'mente', keywords: 'leveza escrita reflexao journaling', Icon: Feather },
  { id: 'Flower2', name: 'Meditação / Zen', group: 'mente', keywords: 'flor natureza paz equilibrio', Icon: Flower2 },
  { id: 'Leaf', name: 'Natureza / Detox', group: 'mente', keywords: 'folha ecologia ar livre pausa', Icon: Leaf },
  { id: 'Sunrise', name: 'Ritual da Manhã', group: 'mente', keywords: 'amanhecer alvorada rotina matinal', Icon: Sunrise },
  { id: 'Sunset', name: 'Desconexão Noturna', group: 'mente', keywords: 'entardecer por do sol relaxar', Icon: Sunset },
  { id: 'Infinity', name: 'Consistência / Fluxo', group: 'mente', keywords: 'flow estado continuo habito', Icon: Infinity },
  { id: 'Anchor', name: 'Estabilidade / Firmeza', group: 'mente', keywords: 'ancora controle sobriedade base', Icon: Anchor },
  { id: 'Zap', name: 'Alta Energia / Disposição', group: 'mente', keywords: 'raio energia potencia motivacao', Icon: Zap },

  // --- 6. ROTINA, CASA & ORGANIZAÇÃO (14 ÍCONES) ---
  { id: 'Home', name: 'Casa / Lar', group: 'rotina', keywords: 'familia residencia arrumacao lar', Icon: Home },
  { id: 'Clock', name: 'Gestão de Tempo', group: 'rotina', keywords: 'horas horario tempo rotina', Icon: Clock },
  { id: 'Calendar', name: 'Agenda Semanal', group: 'rotina', keywords: 'datas prazos compromisso semanal', Icon: Calendar },
  { id: 'Bell', name: 'Lembretes / Alertas', group: 'rotina', keywords: 'notificacao aviso lembrete sinal', Icon: Bell },
  { id: 'ShieldCheck', name: 'Disciplina / Regras', group: 'rotina', keywords: 'protecao seguranca meta garantida', Icon: ShieldCheck },
  { id: 'Key', name: 'Acesso / Responsabilidade', group: 'rotina', keywords: 'chave casa seguranca conquista', Icon: Key },
  { id: 'ShoppingBag', name: 'Compras / Essenciais', group: 'rotina', keywords: 'sacola loja compras itens', Icon: ShoppingBag },
  { id: 'ShoppingCart', name: 'Supermercado / Lista', group: 'rotina', keywords: 'mercado carrinho dispensa feira', Icon: ShoppingCart },
  { id: 'Utensils', name: 'Refeições / Cozinha', group: 'rotina', keywords: 'cozinhar marmita almoco jantar', Icon: Utensils },
  { id: 'Bed', name: 'Quarto / Descanso', group: 'rotina', keywords: 'cama arrumar dormir quarto', Icon: Bed },
  { id: 'Bath', name: 'Autocuidado / Higiene', group: 'rotina', keywords: 'banho skincare cuidado pessoal', Icon: Bath },
  { id: 'Car', name: 'Deslocamento / Veículo', group: 'rotina', keywords: 'carro transito viagem manutencao', Icon: Car },
  { id: 'Plane', name: 'Viagem / Voo', group: 'rotina', keywords: 'aviao aeroporto ferias viagem', Icon: Plane },
  { id: 'MapPin', name: 'Local / Compromisso', group: 'rotina', keywords: 'endereco mapa presencial local', Icon: MapPin },

  // --- 7. FINANÇAS & NEGÓCIOS (14 ÍCONES) ---
  { id: 'Wallet', name: 'Carteira / Orçamento', group: 'financas', keywords: 'dinheiro carteira orcamento gastos', Icon: Wallet },
  { id: 'CreditCard', name: 'Cartão / Faturas', group: 'financas', keywords: 'cartao credito faturas compras', Icon: CreditCard },
  { id: 'DollarSign', name: 'Renda / Faturamento', group: 'financas', keywords: 'dinheiro renda faturamento lucro', Icon: DollarSign },
  { id: 'TrendingUp', name: 'Investimentos / Ações', group: 'financas', keywords: 'investimento acoes rendimento alta', Icon: TrendingUp },
  { id: 'PiggyBank', name: 'Reserva de Emergência', group: 'financas', keywords: 'cofrinho economia reserva guardar', Icon: PiggyBank },
  { id: 'Landmark', name: 'Banco / Patrimônio', group: 'financas', keywords: 'instituicao banco tesouro renda fixa', Icon: Landmark },
  { id: 'Receipt', name: 'Contas / Impostos', group: 'financas', keywords: 'nota fiscal boleto comprovante', Icon: Receipt },
  { id: 'Coins', name: 'Dividendos / Moedas', group: 'financas', keywords: 'moedas proventos renda passiva', Icon: Coins },
  { id: 'Percent', name: 'Juros / Rentabilidade', group: 'financas', keywords: 'taxa porcentagem desconto lucro', Icon: Percent },
  { id: 'Gem', name: 'Ativos de Valor', group: 'financas', keywords: 'diamante riqueza premio luxo', Icon: Gem },
  { id: 'ChartPie', name: 'Alocação de Carteira', group: 'financas', keywords: 'grafico pizza distribuicao ativos', Icon: ChartPie },
  { id: 'Banknote', name: 'Fluxo de Caixa', group: 'financas', keywords: 'cedula pagamento salario caixa', Icon: Banknote },
  { id: 'ArrowUpRight', name: 'Crescimento Financeiro', group: 'financas', keywords: 'evolucao meta financeira subida', Icon: ArrowUpRight },
  { id: 'Scale', name: 'Balanço / Jurídico', group: 'financas', keywords: 'balanca equilibrio contabilidade leis', Icon: Scale },

  // --- 8. LAZER, ARTE & CULTURA (14 ÍCONES) ---
  { id: 'Coffee', name: 'Café / Pausa Social', group: 'lazer', keywords: 'cafe xicara intervalo relax', Icon: Coffee },
  { id: 'Music', name: 'Música / Playlists', group: 'lazer', keywords: 'cancao som audio instrumento', Icon: Music },
  { id: 'Palette', name: 'Arte / Design', group: 'lazer', keywords: 'pintura desenho criativo cores', Icon: Palette },
  { id: 'Camera', name: 'Fotografia / Vídeo', group: 'lazer', keywords: 'foto imagem gravacao camera', Icon: Camera },
  { id: 'Gamepad2', name: 'Gaming / E-Sports', group: 'lazer', keywords: 'jogos videogame controle play', Icon: Gamepad2 },
  { id: 'Globe', name: 'Cultura / Explorar', group: 'lazer', keywords: 'viagem internacional cultura planeta', Icon: Globe },
  { id: 'Headphones', name: 'Podcasts / Áudio', group: 'lazer', keywords: 'fone audio podcast musica', Icon: Headphones },
  { id: 'Film', name: 'Cinema / Filmes', group: 'lazer', keywords: 'filme cinema serie documentario', Icon: Film },
  { id: 'Tv', name: 'Séries / Streaming', group: 'lazer', keywords: 'televisao entretenimento video', Icon: Tv },
  { id: 'Mic', name: 'Canto / Oratória', group: 'lazer', keywords: 'microfone voz gravacao podcast', Icon: Mic },
  { id: 'Guitar', name: 'Instrumento Musical', group: 'lazer', keywords: 'violao guitarra tocar musica', Icon: Guitar },
  { id: 'Clapperboard', name: 'Produção / Roteiro', group: 'lazer', keywords: 'claquete edicao criacao conteudo', Icon: Clapperboard },
  { id: 'Tent', name: 'Camping / Aventura', group: 'lazer', keywords: 'barraca trilha natureza acampamento', Icon: Tent },
  { id: 'Ticket', name: 'Eventos / Shows', group: 'lazer', keywords: 'ingresso teatro show concerto', Icon: Ticket }
];

// Mapa indexado para busca instantânea em O(1)
export const CLEAN_ICONS_MAP = CLEAN_ICONS_COLLECTION.reduce((acc, curr) => {
  acc[curr.id] = curr;
  return acc;
}, {});

// =====================================================================
// COMPONENTE: CleanIcon (Garante renderização rigorosa das diretrizes)
// =====================================================================
export function CleanIcon({
  name,
  size = 18,
  color = 'currentColor',
  strokeWidth = 2,
  className = '',
  style = {}
}) {
  const iconDef = CLEAN_ICONS_MAP[name] || CLEAN_ICONS_MAP['Bookmark'] || { Icon: BookOpen };
  const IconComponent = iconDef.Icon || BookOpen;

  return (
    <IconComponent
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style
      }}
    />
  );
}

// =====================================================================
// COMPONENTE: IconPicker (Seletor Interativo Separado por Categorias)
// =====================================================================
export function IconPicker({
  selectedIcon = 'BookOpen',
  onSelectIcon,
  activeColor = '#818cf8',
  maxHeight = '320px'
}) {
  const [activeGroup, setActiveGroup] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredIcons = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return CLEAN_ICONS_COLLECTION.filter((item) => {
      const matchesGroup = activeGroup === 'all' || item.group === activeGroup;
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query) ||
        item.keywords.toLowerCase().includes(query);
      return matchesGroup && matchesQuery;
    });
  }, [activeGroup, searchQuery]);

  // Agrupamento organizado por categoria para separar visualmente os ícones
  const groupedSections = useMemo(() => {
    const groupsToDisplay = activeGroup === 'all'
      ? CLEAN_ICON_GROUPS.filter((g) => g.id !== 'all')
      : CLEAN_ICON_GROUPS.filter((g) => g.id === activeGroup);

    return groupsToDisplay
      .map((grp) => ({
        ...grp,
        items: filteredIcons.filter((icon) => icon.group === grp.id)
      }))
      .filter((sec) => sec.items.length > 0);
  }, [activeGroup, filteredIcons]);

  const currentIconDef = CLEAN_ICONS_MAP[selectedIcon] || CLEAN_ICONS_COLLECTION[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      
      {/* BARRA DE PREVIEW DO ÍCONE SELECIONADO & CAMPO DE BUSCA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 14px',
            borderRadius: '12px',
            backgroundColor: '#FFFFFF',
            border: `1.5px solid ${activeColor}`,
            boxShadow: `0 2px 8px ${activeColor}25`
          }}
        >
          <CleanIcon name={selectedIcon} size={18} color={activeColor} strokeWidth={2.2} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#1A1B2F' }}>
            {currentIconDef.name}
          </span>
        </div>

        <div style={{ flex: 1, minWidth: '180px', position: 'relative' }}>
          <Search
            size={14}
            color="#7E7F9A"
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder={`Buscar entre ${CLEAN_ICONS_COLLECTION.length} ícones (ex: código, treino, finanças)...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 12px 7px 32px',
              borderRadius: '10px',
              border: '1px solid #D5D6E2',
              backgroundColor: '#FFFFFF',
              fontSize: '12px',
              color: '#1A1B2F',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* FILTROS POR CATEGORIA (Pills com contagem) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
        {CLEAN_ICON_GROUPS.map((grp) => {
          const isSelected = activeGroup === grp.id;
          const count = grp.id === 'all'
            ? CLEAN_ICONS_COLLECTION.length
            : CLEAN_ICONS_COLLECTION.filter((i) => i.group === grp.id).length;

          return (
            <button
              key={grp.id}
              type="button"
              onClick={() => setActiveGroup(grp.id)}
              style={{
                padding: '5px 11px',
                borderRadius: '999px',
                border: isSelected ? '1px solid #211F38' : '1px solid rgba(33, 31, 56, 0.1)',
                backgroundColor: isSelected ? '#211F38' : '#FFFFFF',
                color: isSelected ? '#FFFFFF' : '#4E506B',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{grp.label}</span>
              <span
                style={{
                  fontSize: '9.5px',
                  padding: '1px 5px',
                  borderRadius: '999px',
                  backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(33, 31, 56, 0.08)',
                  color: isSelected ? '#FFFFFF' : '#64748B'
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* CONTAINER DE ÍCONES SEPARADOS EM BLOCOS CATEGORIZADOS */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          maxHeight,
          overflowY: 'auto',
          padding: '10px',
          borderRadius: '16px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E4EC'
        }}
      >
        {groupedSections.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#7E7F9A', fontSize: '12px' }}>
            Nenhum ícone encontrado para "{searchQuery}".
          </div>
        ) : (
          groupedSections.map((section) => (
            <div
              key={section.id}
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '12px',
                padding: '10px',
                border: '1px solid #E2E8F0'
              }}
            >
              {/* Cabeçalho da Seção de Ícones */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                  paddingBottom: '6px',
                  borderBottom: '1px solid #E2E8F0'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: section.badgeColor || activeColor
                    }}
                  />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {section.label}
                  </span>
                </div>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748B' }}>
                  {section.items.length} ícones
                </span>
              </div>

              {/* Grade de Ícones da Categoria */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(66px, 1fr))',
                  gap: '6px'
                }}
              >
                {section.items.map((item) => {
                  const isSelected = selectedIcon === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectIcon?.(item.id)}
                      title={item.name}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        padding: '8px 4px',
                        borderRadius: '10px',
                        border: isSelected ? `2px solid ${activeColor}` : '1px solid #E2E8F0',
                        backgroundColor: isSelected ? `${activeColor}18` : '#FFFFFF',
                        color: isSelected ? activeColor : '#3A3C58',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <CleanIcon
                        name={item.id}
                        size={19}
                        color={isSelected ? activeColor : '#4A4C68'}
                        strokeWidth={2}
                      />
                      <span
                        style={{
                          fontSize: '9.5px',
                          fontWeight: isSelected ? 700 : 500,
                          maxWidth: '58px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          lineHeight: 1.1
                        }}
                      >
                        {item.name.split(' ')[0]}
                      </span>
                      {isSelected && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: activeColor,
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Check size={8} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
