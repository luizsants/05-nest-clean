import 'reflect-metadata'
import 'dotenv/config'
import 'tsconfig-paths/register'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { EnvService } from './env/env.service'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // "true" ativa o type inference
  const envService = app.get(EnvService)

  const port = envService.get('PORT')

  await app.listen(port, '0.0.0.0')
}
bootstrap()
