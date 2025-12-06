import {
  Body,
  Controller,
  Post,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ZodValidationPipe } from 'src/pipes/zod-validation-pipe'
import { PrismaService } from 'src/prisma/prisma.service'
import z from 'zod'
import { compare } from 'bcryptjs' // Replace with real hash comparison
import { AuthGuard } from '@nestjs/passport'

// const authenticateBodySchema = z.object({
//   email: z.email('Please enter a valid email address'),
//   password: z.string().min(6),
// })
// type AuthenticateBodySchema = z.infer<typeof authenticateBodySchema>

@Controller('/questions')
@UseGuards(AuthGuard('jwt'))
export class CreateQuestionController {
  constructor() {}

  @Post()
  async handle() {
    return 'Creating question...'
  }
}
