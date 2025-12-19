import { AppModule } from '@/app.module'
import { PrismaService } from '@/prisma/prisma.service'
import { ConflictException, INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { randomUUID } from 'crypto'
import request from 'supertest'

describe('Create Account Controller (e2e)', () => {
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

  test('[POST] /accounts', async () => {
    const email = `luiz-${randomUUID()}@example.com`

    const response = await request(app.getHttpServer()).post('/accounts').send({
      name: 'Luiz Silva',
      email,
      password: '123456',
    })

    expect(response.statusCode).toBe(201)

    const userOnDatabase = await prisma.user.findUnique({
      where: { email }, // corrigi o email aqui também
    })

    expect(userOnDatabase).toBeTruthy()
    expect(userOnDatabase?.name).toBe('Luiz Silva')
  })

  afterAll(async () => {
    await app.close()
  })
})
