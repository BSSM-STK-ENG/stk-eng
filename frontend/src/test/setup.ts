import '@testing-library/jest-dom/vitest';

const memoryStorage = (() => {
  const store = new Map<string, string>();

  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    get length() {
      return store.size;
    },
  } as Storage;
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: memoryStorage,
  configurable: true,
  writable: true,
});

Object.defineProperty(globalThis, 'sessionStorage', {
  value: memoryStorage,
  configurable: true,
  writable: true,
});

Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
  value: () => {},
  configurable: true,
  writable: true,
});
