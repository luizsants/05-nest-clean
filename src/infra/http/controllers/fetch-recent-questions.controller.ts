import { BadRequestException, Controller, Get, Query } from '@nestjs/common'
import { JwtAuthGuard } from '@/infra/auth/jwt-auth.guard'
import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { UserPayload } from '@/infra/auth/jwt.strategy'
import z from 'zod'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import { FetchRecentQuestionsUseCase } from '@/domain/forum/application/use-cases/fetch-recent-questions'
import { QuestionPresenter } from '../presenters/question-presenter'
import { PrismaService } from '@/infra/database/prisma/prisma.service'

const pageQueryParamSchema = z
  .string()
  .optional()
  .default('1')
  .transform(Number)
  .pipe(z.number().min(1, { message: 'Page must be at least 1' }))

type PageQueryParamSchema = z.infer<typeof pageQueryParamSchema>

const queryValidationPipe = new ZodValidationPipe(pageQueryParamSchema)
@Controller('/questions')
export class FetchRecentQuestionsController {
  constructor(
    private fetchRecentQuestions: FetchRecentQuestionsUseCase,
    private prisma: PrismaService,
  ) {}

  @Get()
  async handle(
    @Query('page', queryValidationPipe) page: PageQueryParamSchema,
    @CurrentUser() _user: UserPayload,
  ) {
    const result = await this.fetchRecentQuestions.execute({
      page,
    })

    if (result.isLeft()) {
      throw new BadRequestException()
    }

    const questions = result.value.questions

    const authorIds = [...new Set(questions.map((q) => q.authorId.toString()))]
    const authors = await this.prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, name: true },
    })
    const authorMap = new Map(authors.map((a) => [a.id, a.name]))

    return {
      questions: questions.map((q) => ({
        ...QuestionPresenter.toHTTP(q),
        authorId: q.authorId.toString(),
        authorName: authorMap.get(q.authorId.toString()) ?? null,
      })),
    }
  }
}
