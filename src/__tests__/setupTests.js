import '@testing-library/jest-dom/vitest';

// Polyfill ResizeObserver para Recharts em ambiente JSDOM
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = ResizeObserverMock;
}
