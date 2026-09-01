import { Module } from '@nestjs/common'
import { CacheRepository } from './cache-repository'
import { InMemoryCacheRepository } from './in-memory-cache-repository'

@Module({
  providers: [
    {
      provide: CacheRepository,
      useClass: InMemoryCacheRepository,
    },
  ],
  exports: [CacheRepository],
})
export class CacheModule {}
