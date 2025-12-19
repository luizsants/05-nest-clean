import { AppModule } from '@/app.module'
import { PrismaService } from '@/prisma/prisma.service'
import { INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import { randomUUID } from 'crypto'
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
    await prisma.question.createMany({
      data: [
        {
          title: 'Question 1',
          slug: `question-1-${randomUUID()}`,
          content: 'Content 1',
          authorId: user.id,
        },
        {
          title: 'Question 2',
          slug: `question-2-${randomUUID()}`,
          content: 'Content 2',
          authorId: user.id,
        },
      ],
    })

    const access_token = jwt.sign({ sub: user.id })

    const response = await request(app.getHttpServer())
      .get('/questions')
      .set('Authorization', `Bearer ${access_token}`)

    expect(response.statusCode).toBe(200)
    expect(response.body.questions).toBeDefined()
    // Agora retorna exatamente as 2 questions do usuário (filtrado por authorId)
    expect(response.body.questions.length).toBe(2)
    // Verifica que contém as titles das questions criadas
    const titles = response.body.questions.map((q: any) => q.title)
    expect(titles).toContain('Question 1')
    expect(titles).toContain('Question 2')
  })

  afterAll(async () => {
    await app.close()
  })
})
