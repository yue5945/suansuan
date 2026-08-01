// localStorage 封装：浏览器用 localStorage，Node 测试注入 Map 替身
(function (global) {
  const PREFIX = "suansuan_";

  // backend: { getItem(k), setItem(k,v) }，缺省用 localStorage
  function createStore(backend) {
    const be = backend || (typeof localStorage !== "undefined" ? localStorage : null);
    if (!be) throw new Error("无可用存储后端");
    return {
      getJSON(key, fallback) {
        try {
          const raw = be.getItem(PREFIX + key);
          if (raw == null) return fallback;
          return JSON.parse(raw);
        } catch (e) {
          return fallback;
        }
      },
      setJSON(key, val) {
        be.setItem(PREFIX + key, JSON.stringify(val));
      },
      remove(key) {
        if (be.removeItem) be.removeItem(PREFIX + key);
      },
    };
  }

  // Node 测试用内存替身
  function createMemoryBackend() {
    const map = new Map();
    return {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => map.set(k, String(v)),
      removeItem: (k) => map.delete(k),
    };
  }

  const api = { createStore, createMemoryBackend, PREFIX };
  if (typeof module !== "undefined") module.exports = api;
  global.LYStore = api;
})(typeof window !== "undefined" ? window : globalThis);
