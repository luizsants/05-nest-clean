import 'reflect-metadata'
import 'dotenv/config'
import 'tsconfig-paths/register'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { EnvService } from './env/env.service'
import helmet from 'helmet'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.use(helmet())

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })

  const envService = app.get(EnvService)

  const port = envService.get('PORT')

  await app.listen(port, '0.0.0.0')
}
bootstrap()
