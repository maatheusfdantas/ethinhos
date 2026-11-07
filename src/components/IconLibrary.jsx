import React, { useState, useMemo } from 'react';
import {
  // Estudos & Conhecimento
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
  // Trabalho & Produtividade
  Briefcase,
  Laptop,
  Code,
  Terminal,
  Layers,
  Target,
  Compass,
  BarChart3,
  Cpu,
  CheckSquare,
  // Saúde & Esporte
  Dumbbell,
  Activity,
  Heart,
  Flame,
  Droplets,
  Footprints,
  Smile,
  Apple,
  Timer,
  // Rotina & Vida Diária
  Home,
  Sparkles,
  Clock,
  Calendar,
  Sun,
  Moon,
  Bell,
  ShieldCheck,
  // Finanças & Recursos
  Wallet,
  CreditCard,
  DollarSign,
  TrendingUp,
  PiggyBank,
  // Lazer & Criatividade
  Coffee,
  Music,
  Palette,
  Camera,
  Gamepad2,
  Globe,
  Headphones,
  Search,
  Check
} from 'lucide-react';

// =====================================================================
// COLEÇÃO CURADA DE ÍCONES DE LINHA MINIMALISTAS (DIRETRIZES CLEAN)
// =====================================================================
// • Estilo Principal: Ícones de linha (line icons / outlines)
// • Geometria: Formas limpas, cantos suaves, curvas precisas
// • Preenchimento: Sem preenchimento interno (fill="none", hollow)
// • Pontos de Terminação: Pontas arredondadas (round caps)
// • Nível de Detalhe: Extremamente simplificado, essencial, sem estilo emoji/cartoon
// =====================================================================

export const CLEAN_ICON_GROUPS = [
  { id: 'all', label: 'Todos' },
  { id: 'estudos', label: 'Estudos' },
  { id: 'trabalho', label: 'Trabalho' },
  { id: 'saude', label: 'Saúde' },
  { id: 'rotina', label: 'Rotina' },
  { id: 'financas', label: 'Finanças' },
  { id: 'lazer', label: 'Lazer' }
];

export const CLEAN_ICONS_COLLECTION = [
  // --- GRUPO: ESTUDOS & CONHECIMENTO ---
  { id: 'BookOpen', name: 'Livro Aberto', group: 'estudos', keywords: 'estudo caderno aula leitura materia', Icon: BookOpen },
  { id: 'GraduationCap', name: 'Capelo / Faculdade', group: 'estudos', keywords: 'universidade curso diploma formacao', Icon: GraduationCap },
  { id: 'Bookmark', name: 'Marcador / Leitura', group: 'estudos', keywords: 'marcador livro capitulo texto', Icon: Bookmark },
  { id: 'PenTool', name: 'Caneta / Redação', group: 'estudos', keywords: 'escrita redacao anotacoes desenho', Icon: PenTool },
  { id: 'Lightbulb', name: 'Ideias / Insight', group: 'estudos', keywords: 'ideia solucao criatividade pensamento', Icon: Lightbulb },
  { id: 'FileText', name: 'Documento / Notas', group: 'estudos', keywords: 'artigo resumo pdf documento', Icon: FileText },
  { id: 'Library', name: 'Acervo / Disciplinas', group: 'estudos', keywords: 'biblioteca livros materias estante', Icon: Library },
  { id: 'Languages', name: 'Idiomas / Línguas', group: 'estudos', keywords: 'ingles linguas conversacao vocabulario', Icon: Languages },
  { id: 'Brain', name: 'Mente / Cognição', group: 'estudos', keywords: 'cerebro memoria raciocinio logica', Icon: Brain },
  { id: 'Calculator', name: 'Cálculo / Exatas', group: 'estudos', keywords: 'matematica calculo fisica numeros', Icon: Calculator },

  // --- GRUPO: TRABALHO & PRODUTIVIDADE ---
  { id: 'Briefcase', name: 'Maleta / Trabalho', group: 'trabalho', keywords: 'carreira escritorio emprego empresa', Icon: Briefcase },
  { id: 'Laptop', name: 'Computador / Home Office', group: 'trabalho', keywords: 'notebook tech trabalho computador', Icon: Laptop },
  { id: 'Code', name: 'Código / Programação', group: 'trabalho', keywords: 'desenvolvimento software dev programar', Icon: Code },
  { id: 'Terminal', name: 'Terminal / Console', group: 'trabalho', keywords: 'devops comandos terminal backend', Icon: Terminal },
  { id: 'Layers', name: 'Camadas / Projetos', group: 'trabalho', keywords: 'arquitetura estrutura organizacao', Icon: Layers },
  { id: 'Target', name: 'Alvo / Objetivos', group: 'trabalho', keywords: 'meta foco objetivo precisao', Icon: Target },
  { id: 'Compass', name: 'Bússola / Estratégia', group: 'trabalho', keywords: 'direcao planejamento visao', Icon: Compass },
  { id: 'BarChart3', name: 'Métricas / Gráfico', group: 'trabalho', keywords: 'analise dados estatisticas vendas', Icon: BarChart3 },
  { id: 'Cpu', name: 'Tecnologia / Hardware', group: 'trabalho', keywords: 'processador chip circuitos tecnologia', Icon: Cpu },
  { id: 'CheckSquare', name: 'Checklist / Tarefas', group: 'trabalho', keywords: 'tarefas to do entregas concluido', Icon: CheckSquare },

  // --- GRUPO: SAÚDE & BEM-ESTAR ---
  { id: 'Dumbbell', name: 'Haltere / Musculação', group: 'saude', keywords: 'academia treino musculacao exercicio', Icon: Dumbbell },
  { id: 'Activity', name: 'Cardio / Frequência', group: 'saude', keywords: 'batimento cardio pulso corrida', Icon: Activity },
  { id: 'Heart', name: 'Coração / Saúde', group: 'saude', keywords: 'vida saude vitalidade corpo', Icon: Heart },
  { id: 'Flame', name: 'Energia / Queima', group: 'saude', keywords: 'calorias fogo metabolismo intensidade', Icon: Flame },
  { id: 'Droplets', name: 'Água / Hidratação', group: 'saude', keywords: 'agua hidratacao liquido beber', Icon: Droplets },
  { id: 'Footprints', name: 'Passos / Caminhada', group: 'saude', keywords: 'passos caminhada corrida movimento', Icon: Footprints },
  { id: 'Smile', name: 'Bem-Estar / Mental', group: 'saude', keywords: 'psicologia mente calma relaxamento', Icon: Smile },
  { id: 'Apple', name: 'Nutrição / Dieta', group: 'saude', keywords: 'comida alimentacao dieta saudavel', Icon: Apple },
  { id: 'Timer', name: 'Cronômetro / Tempo', group: 'saude', keywords: 'descanso serie tempo intervalo', Icon: Timer },

  // --- GRUPO: ROTINA & VIDA DIÁRIA ---
  { id: 'Home', name: 'Casa / Lar', group: 'rotina', keywords: 'familia residencia arrumacao lar', Icon: Home },
  { id: 'Sparkles', name: 'Hábitos / Essenciais', group: 'rotina', keywords: 'habito rotina organizacao autocuidado', Icon: Sparkles },
  { id: 'Clock', name: 'Relógio / Pontualidade', group: 'rotina', keywords: 'horas horario tempo rotina', Icon: Clock },
  { id: 'Calendar', name: 'Calendário / Agenda', group: 'rotina', keywords: 'datas prazos compromisso semanal', Icon: Calendar },
  { id: 'Sun', name: 'Manhã / Matinal', group: 'rotina', keywords: 'sol despertar acordar manha', Icon: Sun },
  { id: 'Moon', name: 'Noite / Sono', group: 'rotina', keywords: 'dormir descanso noite sono', Icon: Moon },
  { id: 'Bell', name: 'Lembretes / Alertas', group: 'rotina', keywords: 'notificacao aviso lembrete sinal', Icon: Bell },
  { id: 'ShieldCheck', name: 'Consistência / Disciplina', group: 'rotina', keywords: 'protecao seguranca meta garantida', Icon: ShieldCheck },

  // --- GRUPO: FINANÇAS & RECURSOS ---
  { id: 'Wallet', name: 'Carteira / Finanças', group: 'financas', keywords: 'dinheiro carteira orcamento gastos', Icon: Wallet },
  { id: 'CreditCard', name: 'Cartão / Pagamentos', group: 'financas', keywords: 'cartao credito faturas compras', Icon: CreditCard },
  { id: 'DollarSign', name: 'Moeda / Capital', group: 'financas', keywords: 'dinheiro renda faturamento lucro', Icon: DollarSign },
  { id: 'TrendingUp', name: 'Crescimento / Aporte', group: 'financas', keywords: 'investimento acoes rendimento alta', Icon: TrendingUp },
  { id: 'PiggyBank', name: 'Poupança / Reserva', group: 'financas', keywords: 'cofrinho economia reserva guardar', Icon: PiggyBank },

  // --- GRUPO: LAZER & CRIATIVIDADE ---
  { id: 'Coffee', name: 'Café / Pausa', group: 'lazer', keywords: 'cafe xicara intervalo relax', Icon: Coffee },
  { id: 'Music', name: 'Música / Playlists', group: 'lazer', keywords: 'cancao som audio instrumento', Icon: Music },
  { id: 'Palette', name: 'Arte / Design', group: 'lazer', keywords: 'pintura desenho criativo cores', Icon: Palette },
  { id: 'Camera', name: 'Fotografia / Vídeo', group: 'lazer', keywords: 'foto imagem gravacao camera', Icon: Camera },
  { id: 'Gamepad2', name: 'Videogame / Jogos', group: 'lazer', keywords: 'jogos videogame controle play', Icon: Gamepad2 },
  { id: 'Globe', name: 'Viagens / Mundo', group: 'lazer', keywords: 'viagem internacional cultura planeta', Icon: Globe },
  { id: 'Headphones', name: 'Fone / Podcasts', group: 'lazer', keywords: 'fone audio podcast musica', Icon: Headphones }
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
// COMPONENTE: IconPicker (Seletor Interativo e Categorizado)
// =====================================================================
export function IconPicker({
  selectedIcon = 'BookOpen',
  onSelectIcon,
  activeColor = '#818cf8',
  maxHeight = '280px'
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
            padding: '6px 12px',
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
            placeholder="Buscar ícone (ex: livro, código, treino)..."
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

      {/* FILTROS POR CATEGORIA (Pills) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflowX: 'auto', paddingBottom: '4px' }}>
        {CLEAN_ICON_GROUPS.map((grp) => {
          const isSelected = activeGroup === grp.id;
          return (
            <button
              key={grp.id}
              type="button"
              onClick={() => setActiveGroup(grp.id)}
              style={{
                padding: '4px 10px',
                borderRadius: '999px',
                border: isSelected ? '1px solid #211F38' : '1px solid transparent',
                backgroundColor: isSelected ? '#211F38' : 'rgba(33, 31, 56, 0.06)',
                color: isSelected ? '#FFFFFF' : '#4E506B',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {grp.label}
            </button>
          );
        })}
      </div>

      {/* GRADE DE ÍCONES DE LINHA MINIMALISTAS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))',
          gap: '8px',
          maxHeight,
          overflowY: 'auto',
          padding: '6px 2px',
          borderRadius: '14px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E4EC'
        }}
      >
        {filteredIcons.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '24px', textAlign: 'center', color: '#7E7F9A', fontSize: '12px' }}>
            Nenhum ícone encontrado para "{searchQuery}".
          </div>
        ) : (
          filteredIcons.map((item) => {
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
                  gap: '5px',
                  padding: '9px 4px',
                  borderRadius: '12px',
                  border: isSelected ? `2px solid ${activeColor}` : '1px solid transparent',
                  backgroundColor: isSelected ? `${activeColor}18` : '#F9F9FC',
                  color: isSelected ? activeColor : '#3A3C58',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.15s ease'
                }}
              >
                <CleanIcon
                  name={item.id}
                  size={20}
                  color={isSelected ? activeColor : '#4A4C68'}
                  strokeWidth={2}
                />
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: isSelected ? 700 : 500,
                    maxWidth: '60px',
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
          })
        )}
      </div>
    </div>
  );
}
