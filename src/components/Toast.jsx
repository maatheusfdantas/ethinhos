import React, { useEffect } from 'react';
import { Undo2, X, CheckCircle2, Info } from 'lucide-react';

export function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return;

    // Listen to global Ctrl+Z / Cmd+Z for undo
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (toast.onUndo) {
          e.preventDefault();
          toast.onUndo();
          onDismiss();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Auto dismiss after 5 seconds
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div 
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-[#15151a] border border-white/[0.08] shadow-2xl text-zinc-200 text-xs tracking-tight transition-all duration-200 animate-[slideUp_0.15s_ease-out]"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
        <span className="font-normal text-zinc-200">{toast.message}</span>
      </div>

      {toast.onUndo && (
        <button
          type="button"
          onClick={() => {
            toast.onUndo();
            onDismiss();
          }}
          className="flex items-center gap-1.5 px-2 py-1 ml-2 text-xs font-medium rounded bg-white/[0.06] hover:bg-white/[0.12] text-zinc-100 active:scale-95 transition-all"
        >
          <Undo2 size={12} className="text-zinc-400" />
          <span>Desfazer (Ctrl+Z)</span>
        </button>
      )}

      <button
        type="button"
        onClick={onDismiss}
        className="text-zinc-500 hover:text-zinc-300 p-1 rounded transition-colors ml-1"
        aria-label="Fechar notificação"
      >
        <X size={13} />
      </button>
    </div>
  );
}
