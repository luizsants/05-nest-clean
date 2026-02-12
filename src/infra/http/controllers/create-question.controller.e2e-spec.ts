import { AppModule } from '@/infra/app.module'
import { DatabaseModule } from '@/infra/database/database.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { StudentFactory } from 'test/factories/make-student'

describe('Create Question (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let jwt: JwtService
  let studentFactory: StudentFactory

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, DatabaseModule],
      providers: [StudentFactory],
    }).compile()

    app = moduleRef.createNestApplication()
    prisma = moduleRef.get<PrismaService>(PrismaService)
    jwt = moduleRef.get<JwtService>(JwtService)
    studentFactory = moduleRef.get<StudentFactory>(StudentFactory)

    await app.init()
  })

  test('[POST] /questions - should create a new question', async () => {
    const email = 'question-user@example.com'

    const user = await studentFactory.makePrismaStudent({ email })

    const accessToken = jwt.sign({ sub: user.id })

    const response = await request(app.getHttpServer())
      .post('/questions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Test Question',
        content: 'This is a test question content.',
      })

    expect(response.statusCode).toBe(201)

    const question = await prisma.question.findFirst({
      where: { authorId: user.id.toString() },
    })

    expect(question).toBeTruthy()
    expect(question?.title).toBe('Test Question')
  })
})
