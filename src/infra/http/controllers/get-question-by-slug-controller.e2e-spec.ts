import { Slug } from '@/domain/forum/enterprise/entities/value-objects/slug'
import { AppModule } from '@/infra/app.module'
import { DatabaseModule } from '@/infra/database/database.module'
import { INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { QuestionFactory } from 'test/factories/make-question'
import { StudentFactory } from 'test/factories/make-student'
import { randomUUID } from 'crypto'

describe('Get question by slug Controller (e2e)', () => {
  let app: INestApplication
  let studentFactory: StudentFactory
  let questionFactory: QuestionFactory
  let jwt: JwtService

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, DatabaseModule],
      providers: [StudentFactory, QuestionFactory],
    }).compile()

    app = moduleRef.createNestApplication()
    studentFactory = moduleRef.get<StudentFactory>(StudentFactory)
    questionFactory = moduleRef.get<QuestionFactory>(QuestionFactory)
    jwt = moduleRef.get<JwtService>(JwtService)

    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  test('[GET] /questions/:slug - should get question by slug', async () => {
    const user = await studentFactory.makePrismaStudent()

    const accessToken = jwt.sign({ sub: user.id.toString() })

    const uniqueId = randomUUID().slice(0, 8)
    const title = `Question ${uniqueId}`
    const slugValue = `question-${uniqueId}-slug`

    await questionFactory.makePrismaQuestion({
      authorId: user.id,
      title,
      slug: Slug.create(slugValue),
    })

    // Busca as perguntas do usuário
    const response = await request(app.getHttpServer())
      .get(`/questions/${slugValue}`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({
      question: expect.objectContaining({ title }),
    })
  })
})
