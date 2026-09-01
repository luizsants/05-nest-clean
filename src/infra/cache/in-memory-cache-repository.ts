import { Injectable } from '@nestjs/common'
import { CacheRepository } from './cache-repository'

@Injectable()
export class InMemoryCacheRepository implements CacheRepository {
  private cache = new Map<string, { value: string; expiresAt: number }>()

  async set(key: string, value: string): Promise<void> {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + 15 * 60 * 1000,
    })
  }

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.value
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key)
  }
}
