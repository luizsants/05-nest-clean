import { AppModule } from '@/app.module'
import { PrismaService } from '@/prisma/prisma.service'
import { INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import request from 'supertest'

describe('Fetch Recent Questions Controller (e2e)', () => {
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

  test('[GET] /questions - should fetch recent questions', async () => {
    const email = 'fetch-user@example.com'

    const user = await prisma.user.create({
      data: {
        name: 'Fetch User',
        email,
        password: 'password123',
      },
    })

    // Cria 2 perguntas para este usuário
    await prisma.question.createMany({
      data: [
        {
          title: 'Question 1',
          slug: 'question-1-slug',
          content: 'Content for question 1',
          authorId: user.id,
        },
        {
          title: 'Question 2',
          slug: 'question-2-slug',
          content: 'Content for question 2',
          authorId: user.id,
        },
      ],
    })

    const access_token = jwt.sign({ sub: user.id })

    // Busca as perguntas do usuário
    const response = await request(app.getHttpServer())
      .get('/questions')
      .set('Authorization', `Bearer ${access_token}`)

    expect(response.statusCode).toBe(200)
    expect(response.body.questions).toBeDefined()
    expect(response.body.questions.length).toBe(2)
    expect(response.body.questions[0].title).toBe('Question 1')
    expect(response.body.questions[1].title).toBe('Question 2')
  })
})
