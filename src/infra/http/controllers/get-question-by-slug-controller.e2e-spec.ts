import { AppModule } from '@/infra/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import request from 'supertest'

describe('Get question by slug Controller (e2e)', () => {
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

  afterAll(async () => {
    await app.close()
  })

  test('[GET] /questions/:slug - should get question by slug', async () => {
    const email = 'fetch-user@example.com'

    const user = await prisma.user.create({
      data: {
        name: 'Fetch User',
        email,
        password: 'password123',
      },
    })

    // Cria 2 perguntas para este usuário
    await prisma.question.create({
      data: {
        title: 'Question 1',
        slug: 'question-1-slug',
        content: 'Content for question 1',
        authorId: user.id,
      },
    })

    const accessToken = jwt.sign({ sub: user.id })

    // Busca as perguntas do usuário
    const response = await request(app.getHttpServer())
      .get(`/questions/question-1-slug`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({
      question: expect.objectContaining({ title: 'Question 1' }),
    })
  })
})
