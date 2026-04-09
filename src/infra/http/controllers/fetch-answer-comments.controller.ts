import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common'
import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { UserPayload } from '@/infra/auth/jwt.strategy'
import z from 'zod'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import { CommentPresenter } from '../presenters/comment-presenter'
import { FetchAnswerCommentsUseCase } from '@/domain/forum/application/use-cases/fetch-answer-comments'
import { PrismaService } from '@/infra/database/prisma/prisma.service'

const pageQueryParamSchema = z
  .string()
  .optional()
  .default('1')
  .transform(Number)
  .pipe(z.number().min(1, { message: 'Page must be at least 1' }))

type PageQueryParamSchema = z.infer<typeof pageQueryParamSchema>

const queryValidationPipe = new ZodValidationPipe(pageQueryParamSchema)
@Controller('/answers/:answerId/comments')
export class FetchAnswerCommentsController {
  constructor(
    private fetchAnswerComments: FetchAnswerCommentsUseCase,
    private prisma: PrismaService,
  ) {}

  @Get()
  async handle(
    @Query('page', queryValidationPipe) page: PageQueryParamSchema,
    @CurrentUser() _user: UserPayload,
    @Param('answerId') answerId: string,
  ) {
    const result = await this.fetchAnswerComments.execute({
      page,
      answerId,
    })

    if (result.isLeft()) {
      throw new BadRequestException()
    }

    const answerComments = result.value.answerComments

    const authorIds = [
      ...new Set(answerComments.map((c) => c.authorId.toString())),
    ]
    const authors = await this.prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, name: true },
    })
    const authorMap = new Map(authors.map((a) => [a.id, a.name]))

    return {
      comments: answerComments.map((c) => ({
        ...CommentPresenter.toHTTP(c),
        authorName: authorMap.get(c.authorId.toString()) ?? null,
      })),
    }
  }
}
