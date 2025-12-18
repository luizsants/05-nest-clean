import { AppModule } from '@/app.module'
import { PrismaService } from '@/prisma/prisma.service'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'

describe('Create Account Controller (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    prisma = moduleRef.get<PrismaService>(PrismaService)

    await app.init()
  })

  // ← Limpa as tabelas antes de CADA teste individual
  beforeEach(async () => {
    await prisma.user.deleteMany()
  })

  test('[POST] /accounts', async () => {
    const response = await request(app.getHttpServer()).post('/accounts').send({
      name: 'Luiz Silva',
      email: 'luiz4@gmail.com',
      password: '123456',
    })

    expect(response.statusCode).toBe(201)

    const userOnDatabase = await prisma.user.findUnique({
      where: { email: 'luiz4@gmail.com' }, // corrigi o email aqui também
    })

    expect(userOnDatabase).toBeTruthy()
    expect(userOnDatabase?.name).toBe('Luiz Silva')
  })

  afterAll(async () => {
    await app.close()
  })
})

// import { AppModule } from '@/app.module'
// import { PrismaService } from '@/prisma/prisma.service'
// import { INestApplication } from '@nestjs/common'
// import { Test } from '@nestjs/testing'
// import request from 'supertest'

// describe('Create Account Controller (e2e)', () => {
//   let app: INestApplication
//   let prisma: PrismaService

//   beforeAll(async () => {
//     const moduleRef = await Test.createTestingModule({
//       imports: [AppModule],
//     }).compile()

//     app = moduleRef.createNestApplication()

//     prisma = moduleRef.get<PrismaService>(PrismaService)

//     await app.init()
//   })

//   test('[POST] /accounts', async () => {
//     const response = await request(app.getHttpServer()).post('/accounts').send({
//       name: 'Luiz Silva',
//       email: 'luiz4@gmail.com',
//       password: '123456',
//     })

//     expect(response.statusCode).toBe(201)

//     const userOnDatabase = await prisma.user.findUnique({
//       where: { email: 'luiz@gmail.com' },
//     })

//     expect(userOnDatabase).toBeTruthy()
//     expect(userOnDatabase?.name).toBe('Luiz Silva')
//   })
// })
