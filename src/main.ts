// src/main.ts
import 'reflect-metadata'
import 'dotenv/config'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ConfigService } from '@nestjs/config'
import { Env } from './env' // ← seu tipo lindo

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // A MÁGICA: o segundo generic "true" ativa o type inference
  const configService = app.get(ConfigService<Env, true>)

  const port = configService.get('PORT', { infer: true }) // ← AGORA SIM: port: number

  await app.listen(port, '0.0.0.0')
}
bootstrap()
