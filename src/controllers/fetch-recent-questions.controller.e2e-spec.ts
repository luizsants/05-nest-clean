import { AppModule } from '@/app.module'
import { PrismaService } from '@/prisma/prisma.service'
import { INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import { randomUUID } from 'crypto'
import request from 'supertest'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../generated/prisma'

describe('Create recent questions Controller (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let jwt: JwtService

  beforeAll(async () => {
    // Cria PrismaService customizado usando o schema UUID do teste
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    const adapter = new PrismaPg(pool)
    const prismaClient = new PrismaClient({ adapter })

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaClient)
      .compile()

    app = moduleRef.createNestApplication()
    prisma = moduleRef.get<PrismaService>(PrismaService)
    jwt = moduleRef.get<JwtService>(JwtService)

    await app.init()
  })

  test('[GET] /questions', async () => {
    const user = await prisma.user.create({
      data: {
        name: 'John Doe',
        email: `john-${randomUUID()}@example.com`,
        password: '123456',
      },
    })

    // Cria questions de uma vez (mais eficiente e evita race condition)
    const questionsData = Array.from({ length: 2 }, (_, i) => ({
      title: `Question Title ${i + 1}`,
      slug: `question-title-${i + 1}-${randomUUID()}`,
      content: `This is question content number ${i + 1}`,
      authorId: user.id,
    }))

    await prisma.question.createMany({
      data: questionsData,
    })

    // Verificar se as questions foram criadas
    const questionsInDb = await prisma.question.findMany()
    console.log('Questions no banco:', questionsInDb.length)

    const access_token = jwt.sign({ sub: user.id })

    const response = await request(app.getHttpServer())
      .get('/questions')
      .set('Authorization', `Bearer ${access_token}`)

    console.log('Response body:', response.body)

    expect(response.statusCode).toBe(200)
    // Verifica que contém as 2 questions criadas neste teste (pode haver outras de schemas antigos não limpos)
    expect(response.body.questions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Question Title 1' }),
        expect.objectContaining({ title: 'Question Title 2' }),
      ])
    )
    expect(response.body.questions.length).toBeGreaterThanOrEqual(2)
  })

  afterAll(async () => {
    await app.close()
  })
})
