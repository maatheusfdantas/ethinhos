import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("ethos-theme", next ? "dark" : "light"); } catch { /* ignore */ }
  };
  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
      className="glass flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-transform hover:scale-105"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
