import { AppModule } from '@/app.module'
import { PrismaService } from '@/prisma/prisma.service'
import { INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
<<<<<<< HEAD
import { randomUUID } from 'crypto'
=======
>>>>>>> 5d5eab0 (chore: e2e tests fully working - simplified sequential execution)
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
<<<<<<< HEAD

    // Limpa dados do teste anterior
    await prisma.question.deleteMany()
    await prisma.user.deleteMany()
  })

  test('[GET] /questions - should fetch recent questions', async () => {
    // Limpa novamente logo antes do teste
    await prisma.question.deleteMany()
    await prisma.user.deleteMany()

    const user = await prisma.user.create({
      data: {
        name: 'John Doe',
        email: `john-${randomUUID()}@example.com`,
        password: '123456',
      },
    })

    // Cria 2 questions
=======
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
>>>>>>> 5d5eab0 (chore: e2e tests fully working - simplified sequential execution)
    await prisma.question.createMany({
      data: [
        {
          title: 'Question 1',
<<<<<<< HEAD
          slug: `question-1-${randomUUID()}`,
          content: 'Content 1',
=======
          slug: 'question-1-slug',
          content: 'Content for question 1',
>>>>>>> 5d5eab0 (chore: e2e tests fully working - simplified sequential execution)
          authorId: user.id,
        },
        {
          title: 'Question 2',
<<<<<<< HEAD
          slug: `question-2-${randomUUID()}`,
          content: 'Content 2',
=======
          slug: 'question-2-slug',
          content: 'Content for question 2',
>>>>>>> 5d5eab0 (chore: e2e tests fully working - simplified sequential execution)
          authorId: user.id,
        },
      ],
    })

    const access_token = jwt.sign({ sub: user.id })

<<<<<<< HEAD
=======
    // Busca as perguntas do usuário
>>>>>>> 5d5eab0 (chore: e2e tests fully working - simplified sequential execution)
    const response = await request(app.getHttpServer())
      .get('/questions')
      .set('Authorization', `Bearer ${access_token}`)

    expect(response.statusCode).toBe(200)
    expect(response.body.questions).toBeDefined()
<<<<<<< HEAD
    // Agora retorna exatamente as 2 questions do usuário (filtrado por authorId)
    expect(response.body.questions.length).toBe(2)
    // Verifica que contém as titles das questions criadas
    const titles = response.body.questions.map((q: any) => q.title)
    expect(titles).toContain('Question 1')
    expect(titles).toContain('Question 2')
  })

  afterAll(async () => {
    await app.close()
=======
    expect(response.body.questions.length).toBe(2)
    expect(response.body.questions[0].title).toBe('Question 1')
    expect(response.body.questions[1].title).toBe('Question 2')
>>>>>>> 5d5eab0 (chore: e2e tests fully working - simplified sequential execution)
  })
})
