import 'reflect-metadata'
import 'dotenv/config'
import 'tsconfig-paths/register'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ConfigService } from '@nestjs/config'
import { Env } from './env' // ← importa o tipo Env

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // "true" ativa o type inference
  const configService = app.get(ConfigService<Env, true>)

  const port = configService.get('PORT', { infer: true }) // ← port: number

  await app.listen(port, '0.0.0.0') // tirar 0.0.0.0 para rodar localmente
}
bootstrap()
