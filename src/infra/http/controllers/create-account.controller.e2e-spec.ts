import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/prisma/prisma.service'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'

describe('Create Account Controller (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    prisma = moduleRef.get(PrismaService)

    await app.init()
  })

  test('[POST] /accounts - should create a new account', async () => {
    const email = 'newuser@example.com'

    const response = await request(app.getHttpServer()).post('/accounts').send({
      name: 'New User',
      email,
      password: '123456',
    })

    expect(response.statusCode).toBe(201)

    const user = await prisma.user.findUnique({ where: { email } })
    expect(user).toBeTruthy()
    expect(user?.name).toBe('New User')
  })
})
