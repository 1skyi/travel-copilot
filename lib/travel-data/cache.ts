// ============================================================
// 简单内存缓存 — 相同 origin/destination/mode 短期内避免重复请求
// 不引入 Redis 等额外基础设施
// ============================================================

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

export class MemoryCache {
  private store = new Map<string, CacheEntry>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  clear(): void {
    this.store.clear();
  }
}
