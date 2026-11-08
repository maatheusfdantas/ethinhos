import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowDown, ArrowRight, Check, Feather } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Dust } from "@/components/Dust";
import { toast } from "sonner";
import { useScrollProgress, range } from "@/hooks/use-scroll-progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ethos — Organização, hábitos e foco" },
      {
        name: "description",
        content:
          "Um santuário digital para organizar compromissos, cultivar hábitos e focar no que importa.",
      },
      { property: "og:title", content: "Ethos — Organização, hábitos e foco" },
      {
        property: "og:description",
        content: "Agenda, hábitos e foco em um só lugar, com calma e clareza.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main
      className="relative bg-background text-foreground"
      onPointerMove={(e) => {
        const card = (e.target as HTMLElement).closest<HTMLElement>(".glow-card");
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
    >
      <Dust />
      <div className="scroll-progress fixed inset-x-0 top-0 z-50 h-0.5 bg-accent" />
      <Nav />
      <Hero />
      <Manifesto />
      <Features />
      <Journey />
      <Team />
      <Waitlist />
      <Footer />
    </main>
  );
}

/* ---------------- NAV ---------------- */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <nav
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-500",
        scrolled ? "border-b border-border/60 bg-background/80 backdrop-blur-xl" : "",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#top" className="flex items-center gap-2.5">
          <Feather className="h-4 w-4 text-accent" strokeWidth={1.5} />
          <span className="text-sm font-semibold tracking-[0.3em]">ETHOS</span>
        </a>
        <div className="hidden items-center gap-10 text-sm text-muted-foreground md:flex">
          <a href="#recursos" className="transition-colors hover:text-foreground">Recursos</a>
          <a href="#jornada" className="transition-colors hover:text-foreground">Jornada</a>
          <a href="#equipe" className="transition-colors hover:text-foreground">Equipe</a>
        </div>
        <div className="flex items-center gap-3">
        <ThemeToggle />
        <a
          href="#waitlist"
          className="rounded-full bg-primary px-5 py-2 text-xs font-medium tracking-wide text-primary-foreground transition-opacity hover:opacity-85"
        >
          Lista de espera
        </a>
        </div>
      </div>
    </nav>
  );
}

/* ---------------- HERO: pinned + parallax ---------------- */
function Hero() {
  const { ref, progress: p } = useScrollProgress<HTMLElement>();
  const out = range(p, 0.35, 1);
  return (
    <section id="top" ref={ref} className="relative h-[220vh]">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        {/* Parallax layers: each moves at a different speed */}
        <div className="grain absolute inset-0 opacity-60" style={{ transform: `translateY(${p * -80}px)` }} />
        <div
          className="glow absolute left-1/2 top-1/2 h-[70vmax] w-[70vmax] -translate-x-1/2 -translate-y-1/2"
          style={{ transform: `translate(-50%, calc(-50% + ${p * 260}px)) scale(${1 + p * 0.6})` }}
        />
        <div
          className="absolute left-[8%] top-[22%] h-40 w-px bg-border"
          style={{ transform: `translateY(${p * -420}px)` }}
        />
        <div
          className="absolute right-[12%] top-[60%] h-56 w-px bg-border"
          style={{ transform: `translateY(${p * -620}px)` }}
        />
        <div
          className="absolute right-[18%] top-[18%] h-2 w-2 rounded-full bg-accent"
          style={{ transform: `translateY(${p * -300}px)` }}
        />
        <div
          className="absolute bottom-[20%] left-[20%] h-1.5 w-1.5 rounded-full bg-sage"
          style={{ transform: `translateY(${p * -520}px)` }}
        />

        <div
          className="relative z-10 px-6 text-center"
          style={{
            opacity: 1 - out,
            transform: `translateY(${out * -60}px) scale(${1 - out * 0.08})`,
            filter: `blur(${out * 8}px)`,
          }}
        >
          <p className="eyebrow mb-8">Um novo ritmo para o seu dia</p>
          <h1 className="mx-auto max-w-4xl font-display text-6xl leading-[0.95] tracking-tight md:text-8xl lg:text-[8.5rem]">
            Equilíbrio
            <br />
            <em className="text-accent">para a sua rotina.</em>
          </h1>
          <p className="mx-auto mt-10 max-w-md text-base leading-relaxed text-muted-foreground">
            Agenda, hábitos e foco reunidos em um espaço calmo — sem ruído, sem pressa.
          </p>
          <div className="mt-14 flex flex-col items-center gap-3 text-muted-foreground">
            <span className="eyebrow">Role para despertar</span>
            <ArrowDown className="h-4 w-4 animate-bounce" strokeWidth={1.25} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- MANIFESTO: words light up with scroll ---------------- */
const MANIFESTO =
  "Os dias se fragmentam em aplicativos, notificações e listas esquecidas. O Ethos reúne o que importa em um só lugar — para que você organize o tempo, cultive constância e volte a respirar.";

function Manifesto() {
  const { ref, progress: p } = useScrollProgress<HTMLElement>();
  const words = MANIFESTO.split(" ");
  const lit = range(p, 0.1, 0.85) * words.length;
  return (
    <section ref={ref} className="relative h-[260vh] bg-ink text-ink-foreground">
      <div className="sticky top-0 flex h-screen items-center">
        <div className="mx-auto max-w-5xl px-6">
          <p className="eyebrow mb-10 text-ink-foreground/50">Manifesto</p>
          <p className="font-display text-4xl leading-[1.15] md:text-6xl">
            {words.map((w, i) => (
              <span
                key={i}
                className="transition-opacity duration-300"
                style={{ opacity: i < lit ? 1 : 0.14 }}
              >
                {w}{" "}
              </span>
            ))}
          </p>
          <div className="mt-14 h-px w-full bg-ink-foreground/10">
            <div className="h-px bg-accent" style={{ width: `${range(p, 0.1, 0.85) * 100}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- FEATURES: pinned stepper ---------------- */
const FEATURES = [
  {
    n: "01",
    title: "Calendário & agenda",
    text: "Visualize a semana com clareza. Compromissos organizados com leveza, sem excesso de informação.",
  },
  {
    n: "02",
    title: "Registro de hábitos",
    text: "Pequenas marcas diárias que se tornam constância. Acompanhe o progresso sem culpa.",
  },
  {
    n: "03",
    title: "Pomodoro & foco",
    text: "Ciclos de concentração equilibrados com pausas reais. Profundidade, não pressa.",
  },
];

function Features() {
  const { ref, progress: p } = useScrollProgress<HTMLElement>();
  const active = Math.min(FEATURES.length - 1, Math.floor(p * FEATURES.length));
  const local = Math.min(1, p * FEATURES.length - active);
  return (
    <section id="recursos" ref={ref} className="relative h-[400vh]">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-16 px-6 md:grid-cols-2">
          <div>
            <p className="eyebrow mb-6">Ferramentas essenciais</p>
            <h2 className="font-display text-5xl leading-none md:text-6xl">
              Tudo em <em className="text-accent">harmonia.</em>
            </h2>
            <ol className="mt-14 space-y-8">
              {FEATURES.map((f, i) => (
                <li
                  key={f.n}
                  className={cn(
                    "border-l pl-6 transition-all duration-500",
                    i === active ? "border-accent opacity-100" : "border-border opacity-35",
                  )}
                >
                  <span className="text-xs tabular-nums text-muted-foreground">{f.n}</span>
                  <h3 className="mt-1 text-xl font-medium">{f.title}</h3>
                  <p
                    className={cn(
                      "overflow-hidden text-sm leading-relaxed text-muted-foreground transition-all duration-500",
                      i === active ? "mt-2 max-h-24" : "max-h-0",
                    )}
                  >
                    {f.text}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          <div className="relative aspect-[4/5] w-full md:aspect-square">
            <div className="glow absolute -inset-10 opacity-70" />
            <div
              className="relative h-full glass glow-card rounded-3xl p-8 shadow-soft"
              style={{ transform: `perspective(1200px) rotateX(${(0.5 - local) * 6}deg)` }}
            >
              <div className="mb-8 flex items-center justify-between">
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-border" />
                  <span className="h-2 w-2 rounded-full bg-border" />
                  <span className="h-2 w-2 rounded-full bg-border" />
                </div>
                <span className="text-[10px] tracking-widest text-muted-foreground">
                  ETHOS / {FEATURES[active]?.n}
                </span>
              </div>
              <div className="relative h-[calc(100%-3.5rem)]">
                {[<CalendarMock key="c" />, <HabitsMock key="h" p={local} />, <FocusMock key="f" p={local} />].map(
                  (m, i) => (
                    <div
                      key={i}
                      className="absolute inset-0 transition-all duration-500 ease-out"
                      style={{
                        opacity: i === active ? 1 : 0,
                        visibility: i === active ? "visible" : "hidden",
                        filter: i === active ? "none" : "blur(6px)",
                        transform: `translateY(${(i - active) * 40}px)`,
                      }}
                    >
                      {m}
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CalendarMock() {
  const days = [
    ["SEG", "12", "Planejamento"],
    ["TER", "13", "Reunião · 14h"],
    ["QUA", "14", "Projeto Ethos"],
    ["QUI", "15", "Leitura · 19h"],
    ["SEX", "16", "Revisão"],
  ];
  return (
    <div className="flex h-full flex-col">
      <p className="font-display text-3xl">Outubro</p>
      <p className="mb-6 text-xs text-muted-foreground">Visão semanal</p>
      <div className="flex-1 space-y-2">
        {days.map(([d, n, t], i) => (
          <div
            key={d}
            className={cn(
              "flex items-center gap-4 rounded-xl border px-4 py-3",
              i === 2 ? "border-accent/40 bg-accent/5" : "border-border",
            )}
          >
            <span className="w-8 text-[10px] tracking-widest text-muted-foreground">{d}</span>
            <span className="w-6 font-display text-xl">{n}</span>
            <span className="text-sm">{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HabitsMock({ p }: { p: number }) {
  const habits = ["Meditar", "Ler 20 páginas", "Caminhar", "Beber água"];
  const filled = Math.round(p * 28);
  return (
    <div className="flex h-full flex-col">
      <p className="font-display text-3xl">Constância</p>
      <p className="mb-6 text-xs text-muted-foreground">Últimos 7 dias</p>
      <div className="space-y-5">
        {habits.map((h, r) => (
          <div key={h} className="flex items-center justify-between">
            <span className="text-sm">{h}</span>
            <div className="flex gap-1.5">
              {Array.from({ length: 7 }).map((_, c) => (
                <span
                  key={c}
                  className={cn(
                    "h-5 w-5 rounded-[5px] border transition-colors duration-300",
                    r * 7 + c < filled ? "border-sage bg-sage" : "border-border",
                  )}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FocusMock({ p }: { p: number }) {
  const r = 80;
  const c = 2 * Math.PI * r;
  const mins = Math.max(0, Math.round(25 - p * 25));
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <svg viewBox="0 0 200 200" className="h-56 w-56 -rotate-90">
        <circle cx="100" cy="100" r={r} fill="none" stroke="var(--border)" strokeWidth="2" />
        <circle
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
        />
      </svg>
      <p className="-mt-36 font-display text-6xl tabular-nums">{String(mins).padStart(2, "0")}:00</p>
      <p className="mt-24 eyebrow">Sessão de foco</p>
    </div>
  );
}

/* ---------------- JOURNEY: pinned horizontal scroll ---------------- */
const PHASES = [
  {
    tag: "Fase 01 · Início",
    title: "De onde veio a inspiração",
    text: "A semente do Ethos surgiu da busca por um espaço único que unisse compromissos e hábitos, sem a poluição visual dos aplicativos tradicionais.",
  },
  {
    tag: "Fase 02 · Desenvolvimento",
    title: "Enfrentando as dificuldades",
    text: "Identificamos o problema central: a fragmentação da rotina. Superamos limites de sincronização e arquitetura para criar uma experiência fluida.",
  },
  {
    tag: "Fase 03 · Presente",
    title: "O mercado e nossa missão",
    text: "O mercado carecia de ferramentas humanizadas. O Ethos surge como resposta acolhedora para quem busca produtividade com equilíbrio.",
  },
];

function Journey() {
  const { ref, progress: p } = useScrollProgress<HTMLElement>();
  return (
    <section id="jornada" ref={ref} className="relative h-[320vh] bg-secondary">
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div className="mx-auto mb-14 w-full max-w-6xl px-6">
          <p className="eyebrow mb-4">Nossa jornada</p>
          <h2 className="font-display text-5xl md:text-6xl">
            Como o Ethos <em className="text-accent">nasceu.</em>
          </h2>
        </div>
        <div className="relative">
          <div
            className="flex gap-8 pl-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))] will-change-transform"
            style={{ transform: `translateX(calc(${-p} * (100% - 100vw + 6rem)))`, width: "max-content" }}
          >
            {PHASES.map((ph, i) => (
              <article
                key={ph.tag}
                className="w-[80vw] max-w-[36rem] shrink-0 glass glow-card rounded-3xl p-10 shadow-soft md:p-14"
              >
                <span className="font-display text-7xl text-accent/30">0{i + 1}</span>
                <p className="eyebrow mt-6">{ph.tag}</p>
                <h3 className="mt-3 font-display text-3xl md:text-4xl">{ph.title}</h3>
                <p className="mt-5 leading-relaxed text-muted-foreground">{ph.text}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="mx-auto mt-14 w-full max-w-6xl px-6">
          <div className="h-px bg-border">
            <div className="h-px bg-foreground" style={{ width: `${p * 100}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- TEAM: parallax cards + CSS view() reveals ---------------- */
function Team() {
  const { ref, progress: p } = useScrollProgress<HTMLElement>();
  const devs = [
    {
      i: "D1",
      name: "Desenvolvedor 1",
      role: "Engenharia de sistemas & arquitetura",
      text: "Cria estruturas robustas e seguras, cuidando da estabilidade e da performance da sua experiência.",
    },
    {
      i: "D2",
      name: "Desenvolvedor 2",
      role: "Design de interface & experiência",
      text: "Desenha interfaces acolhedoras e intuitivas — tecnologia acessível e agradável para todas as idades.",
    },
  ];
  return (
    <section id="equipe" ref={ref} className="relative py-40">
      <div className="mx-auto max-w-6xl px-6">
        <div className="reveal mb-20 max-w-xl">
          <p className="eyebrow mb-4">A equipe</p>
          <h2 className="font-display text-5xl md:text-6xl">
            Quem cria o <em className="text-accent">Ethos.</em>
          </h2>
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          {devs.map((d, k) => (
            <div key={d.i} style={{ transform: `translateY(${(k === 0 ? 1 : -1) * (p - 0.5) * 120}px)` }}>
              <article className="clip-reveal glass glow-card rounded-3xl p-10">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ink font-display text-xl text-ink-foreground">
                  {d.i}
                </div>
                <h3 className="mt-8 text-xl font-medium">{d.name}</h3>
                <p className="mt-1 text-sm text-accent">{d.role}</p>
                <p className="mt-5 leading-relaxed text-muted-foreground">{d.text}</p>
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- WAITLIST ---------------- */
function Waitlist() {
  const [done, setDone] = useState(false);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDone(true);
    toast.success("Inscrição realizada! Fique atento ao seu e-mail.");
  };
  return (
    <section id="waitlist" className="relative overflow-hidden bg-ink py-40 text-ink-foreground">
      <div className="glow absolute left-1/2 top-0 h-[50rem] w-[50rem] -translate-x-1/2 opacity-40" />
      <div className="reveal relative mx-auto max-w-xl px-6 text-center">
        <p className="eyebrow mb-6 text-ink-foreground/50">Lista de espera exclusiva</p>
        <h2 className="font-display text-5xl leading-none md:text-7xl">
          Garanta seu <em className="text-accent">acesso.</em>
        </h2>
        <p className="mx-auto mt-6 max-w-md text-ink-foreground/60">
          Seja um dos primeiros a experimentar uma nova forma de organizar a rotina.
        </p>
        {done ? (
          <div className="mt-14 flex flex-col items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent">
              <Check className="h-5 w-5 text-accent-foreground" />
            </div>
            <p className="font-display text-2xl">Você está na lista.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-14 space-y-4 text-left">
            <input
              required
              placeholder="Seu nome"
              className="w-full border-b border-ink-foreground/20 bg-transparent py-4 outline-none transition-colors placeholder:text-ink-foreground/40 focus:border-accent"
            />
            <input
              required
              type="email"
              placeholder="Seu melhor e-mail"
              className="w-full border-b border-ink-foreground/20 bg-transparent py-4 outline-none transition-colors placeholder:text-ink-foreground/40 focus:border-accent"
            />
            <input
              placeholder="Maior dificuldade com produtividade (opcional)"
              className="w-full border-b border-ink-foreground/20 bg-transparent py-4 outline-none transition-colors placeholder:text-ink-foreground/40 focus:border-accent"
            />
            <button
              type="submit"
              className="group mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-4 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
            >
              Entrar na lista
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-ink-foreground/10 bg-ink text-ink-foreground/50">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs md:flex-row">
        <span className="tracking-[0.3em]">ETHOS © 2026</span>
        <div className="flex gap-6">
          <a href="#" className="hover:text-ink-foreground">Termos de uso</a>
          <a href="#" className="hover:text-ink-foreground">Privacidade</a>
        </div>
      </div>
    </footer>
  );
}
