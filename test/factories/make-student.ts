import { faker } from '@faker-js/faker'
import { randomUUID } from 'crypto'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import {
  Student,
  StudentProps,
} from '@/domain/forum/enterprise/entities/student'
import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { PrismaStudentMapper } from '@/infra/database/prisma/mappers/prisma-student-mapper'

export function makeStudent(
  override: Partial<StudentProps> = {},
  id?: UniqueEntityID,
) {
  // Add UUID to email to ensure uniqueness across parallel tests
  const uniqueId = randomUUID().slice(0, 8)
  const student = Student.create(
    {
      name: faker.person.fullName(),
      email: `user-${uniqueId}@test.com`,
      password: faker.internet.password(),
      ...override,
    },
    id,
  )
  return student
}

@Injectable()
export class StudentFactory {
  constructor(private prisma: PrismaService) {}

  async makePrismaStudent(data: Partial<StudentProps> = {}): Promise<Student> {
    const student = makeStudent(data)

    await this.prisma.user.create({
      data: PrismaStudentMapper.toPrisma(student),
    })

    return student
  }
}
