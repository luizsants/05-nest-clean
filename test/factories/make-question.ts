import { faker } from '@faker-js/faker'
import { randomUUID } from 'crypto'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import {
  Question,
  QuestionProps,
} from '@/domain/forum/enterprise/entities/question'
import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { PrismaQuestionMapper } from '@/infra/database/prisma/mappers/prisma-question-mapper'

export function makeQuestion(
  override: Partial<QuestionProps> = {},
  id?: UniqueEntityID,
) {
  // Add UUID to title to ensure slug uniqueness across parallel tests
  const uniqueId = randomUUID().slice(0, 8)
  const question = Question.create(
    {
      authorId: new UniqueEntityID(),
      title: `${faker.lorem.sentence()} [${uniqueId}]`,
      content: faker.lorem.text(),
      ...override,
    },
    id,
  )
  return question
}

@Injectable()
export class QuestionFactory {
  constructor(private prisma: PrismaService) {}

  async makePrismaQuestion(
    data: Partial<QuestionProps> = {},
  ): Promise<Question> {
    const question = makeQuestion(data)

    await this.prisma.question.create({
      data: PrismaQuestionMapper.toPrisma(question),
    })

    return question
  }
}
