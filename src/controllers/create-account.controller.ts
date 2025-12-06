import {
  Body,
  ConflictException,
  Controller,
  HttpCode,
  Post,
  UsePipes,
} from '@nestjs/common'
import * as bcrypt from 'bcrypt' // ← Correct import
import { ZodValidationPipe } from 'src/pipes/zod-validation-pipe'
import { PrismaService } from 'src/prisma/prisma.service'
import { z } from 'zod'

const createAccountBodySchema = z.object({
  name: z.string().min(3),
  email: z.email('Please enter a valid email address'),
  // email: z.string().email() ← deprecated
  password: z.string().min(6),
})
type CreateAccountBody = z.infer<typeof createAccountBodySchema>

@Controller('/accounts')
export class CreateAccountController {
  constructor(private prisma: PrismaService) {}

  @Post()
  @HttpCode(201)
  @UsePipes(new ZodValidationPipe(createAccountBodySchema))
  async handle(@Body() body: CreateAccountBody) {
    const { name, email, password } = body

    const existing = await this.prisma.user.findMany({
      where: { email },
    })

    if (existing.length > 0) {
      throw new ConflictException('Email already in use')
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await this.prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    })
  }
}
