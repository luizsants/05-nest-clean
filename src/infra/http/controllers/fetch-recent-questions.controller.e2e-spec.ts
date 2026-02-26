import { AppModule } from '@/infra/app.module'
import { DatabaseModule } from '@/infra/database/database.module'
import { INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { QuestionFactory } from 'test/factories/make-question'
import { StudentFactory } from 'test/factories/make-student'
import { randomUUID } from 'crypto'

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
    const user = await studentFactory.makePrismaStudent()
    const accessToken = jwt.sign({ sub: user.id.toString() })

    const uniqueId = randomUUID().slice(0, 8)
    const title1 = `Question 1 ${uniqueId}`
    const title2 = `Question 2 ${uniqueId}`

    // Cria 2 perguntas para este usuário (sequencial para garantir ordem)
    await questionFactory.makePrismaQuestion({
      authorId: user.id,
      title: title1,
    })
    await questionFactory.makePrismaQuestion({
      authorId: user.id,
      title: title2,
    })

    // Busca as perguntas do usuário
    const response = await request(app.getHttpServer())
      .get('/questions')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(response.statusCode).toBe(200)
    expect(response.body.questions).toBeDefined()
    expect(response.body.questions.length).toBeGreaterThanOrEqual(2)
    expect(response.body.questions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: title1,
        }),
        expect.objectContaining({
          title: title2,
        }),
      ]),
    )
  })
})
