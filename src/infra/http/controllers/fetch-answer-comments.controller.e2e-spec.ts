import { AppModule } from '@/infra/app.module'
import { DatabaseModule } from '@/infra/database/database.module'
import { INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AnswerFactory } from 'test/factories/make-answer'
import { AnswerCommentFactory } from 'test/factories/make-answer-comment'
import { QuestionFactory } from 'test/factories/make-question'
import { StudentFactory } from 'test/factories/make-student'

describe('Fetch answer comments (e2e)', () => {
  let app: INestApplication
  let jwt: JwtService
  let studentFactory: StudentFactory
  let questionFactory: QuestionFactory
  let answerFactory: AnswerFactory
  let answerCommentFactory: AnswerCommentFactory

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, DatabaseModule],
      providers: [
        StudentFactory,
        QuestionFactory,
        AnswerFactory,
        AnswerCommentFactory,
      ],
    }).compile()

    app = moduleRef.createNestApplication()
    jwt = moduleRef.get<JwtService>(JwtService)
    studentFactory = moduleRef.get<StudentFactory>(StudentFactory)

    answerCommentFactory =
      moduleRef.get<AnswerCommentFactory>(AnswerCommentFactory)
    questionFactory = moduleRef.get<QuestionFactory>(QuestionFactory)

    answerFactory = moduleRef.get<AnswerFactory>(AnswerFactory)

    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  test('[GET] /answers/:answerId/comments', async () => {
    const user = await studentFactory.makePrismaStudent()

    const accessToken = jwt.sign({ sub: user.id.toString() })

    const question = await questionFactory.makePrismaQuestion({
      authorId: user.id,
    })

    const answer = await answerFactory.makePrismaAnswer({
      authorId: user.id,
      questionId: question.id,
    })

    await Promise.all([
      await answerCommentFactory.makePrismaAnswerComment({
        authorId: user.id,
        answerId: answer.id,
        content: 'New Comment 1',
      }),
      await answerCommentFactory.makePrismaAnswerComment({
        authorId: user.id,
        answerId: answer.id,
        content: 'New Comment 2',
      }),
    ])

    const answerId = answer.id.toString()

    const response = await request(app.getHttpServer())
      .get(`/answers/${answerId}/comments`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(response.statusCode).toBe(200)

    expect(response.body).toEqual({
      comments: expect.arrayContaining([
        expect.objectContaining({
          content: 'New Comment 1',
        }),
        expect.objectContaining({
          content: 'New Comment 2',
        }),
      ]),
    })
  })
})
