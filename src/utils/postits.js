// Notas (antigos post-its). Os dados continuam no mesmo lugar de sempre: user.postIts / coluna post_its / cópia local.
export const POSTIT_COLORS = [
  { id: 'yellow', name: 'Amarelo', bg: '#FEF08A', border: '#FDE047', text: '#713F12', pin: '#CA8A04' },
  { id: 'pink', name: 'Rosa', bg: '#FBCFE8', border: '#F9A8D4', text: '#831843', pin: '#DB2777' },
  { id: 'blue', name: 'Azul', bg: '#BAE6FD', border: '#7DD3FC', text: '#0C4A6E', pin: '#0284C7' },
  { id: 'green', name: 'Verde', bg: '#BBF7D0', border: '#86EFAC', text: '#14532D', pin: '#16A34A' },
  { id: 'purple', name: 'Lavanda', bg: '#DDD6FE', border: '#C4B5FD', text: '#4C1D95', pin: '#7C3AED' },
  { id: 'orange', name: 'Pêssego', bg: '#FED7AA', border: '#FDBA74', text: '#7C2D12', pin: '#EA580C' }
];

export const NOTE_MAX = 280;

export function loadNotes(user) {
  try {
    if (Array.isArray(user?.postIts) && user.postIts.length > 0) return user.postIts;
    const saved = localStorage.getItem(`ethos_postits_${user?.id || 'default'}`);
    if (saved) return JSON.parse(saved);
  } catch { /* sem armazenamento */ }
  return [];
}

/** Pinadas primeiro; o resto na ordem em que está salvo (mais novas primeiro). */
export const sortNotes = (notes) => [...notes].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

export function persistNotes(user, setUser, next) {
  setUser?.((prev) => (prev ? { ...prev, postIts: next } : prev));
  try {
    localStorage.setItem(`ethos_postits_${user?.id || 'default'}`, JSON.stringify(next));
    if (user?.id) {
      fetch(`/api/user/${user.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postIts: next })
      }).catch(() => {});
    }
  } catch { /* sem armazenamento */ }
}
