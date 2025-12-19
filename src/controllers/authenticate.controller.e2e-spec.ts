import { AppModule } from '@/app.module'
import { PrismaService } from '@/prisma/prisma.service'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { hash } from 'bcryptjs'
import request from 'supertest'

describe('Authenticate Controller (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    prisma = moduleRef.get<PrismaService>(PrismaService)

    await app.init()

    // Limpa dados do teste anterior
    await prisma.question.deleteMany()
    await prisma.user.deleteMany()
  })

  afterAll(async () => {
    await app.close()
  })

  test('[POST] /sessions - should authenticate successfully', async () => {
    const email = 'test-auth@example.com'
    const password = '123456'

    await prisma.user.create({
      data: {
        name: 'Test User',
        email,
        password: await hash(password, 8),
      },
    })

    const response = await request(app.getHttpServer()).post('/sessions').send({
      email,
      password,
    })

    expect(response.statusCode).toBe(201)
    expect(response.body.access_token).toBeDefined()
  })
})
