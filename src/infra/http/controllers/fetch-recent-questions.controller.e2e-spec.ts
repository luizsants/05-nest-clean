import { AppModule } from '@/infra/app.module'
import { DatabaseModule } from '@/infra/database/database.module'
import { INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { QuestionFactory } from 'test/factories/make-question'
import { StudentFactory } from 'test/factories/make-student'

describe('Fetch Recent Questions Controller (e2e)', () => {
  let app: INestApplication
  let jwt: JwtService
  let studentFactory: StudentFactory
  let questionFactory: QuestionFactory

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, DatabaseModule],
      providers: [StudentFactory, QuestionFactory],
    }).compile()

    app = moduleRef.createNestApplication()
    jwt = moduleRef.get<JwtService>(JwtService)
    studentFactory = moduleRef.get<StudentFactory>(StudentFactory)
    questionFactory = moduleRef.get<QuestionFactory>(QuestionFactory)

    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  test('[GET] /questions - should fetch recent questions', async () => {
    const email = 'fetch-user@example.com'

    const user = await studentFactory.makePrismaStudent({ email })
    const accessToken = jwt.sign({ sub: user.id.toString() })

    // Cria 2 perguntas para este usuário
    await Promise.all([
      questionFactory.makePrismaQuestion({
        authorId: user.id,
        title: 'Question 1',
      }),
      questionFactory.makePrismaQuestion({
        authorId: user.id,
        title: 'Question 2',
      }),
    ])

    // Busca as perguntas do usuário
    const response = await request(app.getHttpServer())
      .get('/questions')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(response.statusCode).toBe(200)
    expect(response.body.questions).toBeDefined()
    expect(response.body.questions.length).toBe(2)
    expect(response.body.questions[0].title).toBe('Question 1')
    expect(response.body.questions[1].title).toBe('Question 2')
  })
})
