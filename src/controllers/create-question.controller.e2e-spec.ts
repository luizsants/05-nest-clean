import { AppModule } from '@/app.module'
import { PrismaService } from '@/prisma/prisma.service'
import { ConflictException, INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import { randomUUID } from 'crypto'
import request from 'supertest'

describe('Create Question Controller (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let jwt: JwtService

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    prisma = moduleRef.get<PrismaService>(PrismaService)
    jwt = moduleRef.get<JwtService>(JwtService)

    await app.init()
  })

  test('[POST] /questions', async () => {
    const email = `luiz-${randomUUID()}@example.com`

    const user = await prisma.user.create({
      data: {
        name: 'Luiz Silva',
        email: email,
        password: '123456',
      },
    })

    const access_token = jwt.sign({ sub: user.id })

    const response = await request(app.getHttpServer())
      .post('/questions')
      .send({
        title: 'Sample Question Title',
        content: 'This is a sample question content.',
      })

    expect(response.statusCode).toBe(201)

    const userOnDatabase = await prisma.user.findUnique({
      where: { email },
    })

    expect(userOnDatabase).toBeTruthy()
    expect(userOnDatabase?.name).toBe('Luiz Silva')
  })

  afterAll(async () => {
    await app.close()
  })
})
