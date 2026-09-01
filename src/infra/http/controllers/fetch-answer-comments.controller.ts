import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common'
import z from 'zod'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import { FetchAnswerCommentsUseCase } from '@/domain/forum/application/use-cases/fetch-answer-comments'
import { CommentWithAuthorPresenter } from '../presenters/comment-with-author-presenter'
import { Public } from '@/infra/auth/public'

const pageQueryParamSchema = z
  .string()
  .optional()
  .default('1')
  .transform(Number)
  .pipe(z.number().min(1, { message: 'Page must be at least 1' }))

type PageQueryParamSchema = z.infer<typeof pageQueryParamSchema>

const queryValidationPipe = new ZodValidationPipe(pageQueryParamSchema)
@Controller('/answers/:answerId/comments')
@Public()
export class FetchAnswerCommentsController {
  constructor(private fetchAnswerComments: FetchAnswerCommentsUseCase) {}

  @Get()
  async handle(
    @Query('page', queryValidationPipe) page: PageQueryParamSchema,
    @Param('answerId') answerId: string,
  ) {
    const result = await this.fetchAnswerComments.execute({
      page,
      answerId,
    })

    if (result.isLeft()) {
      throw new BadRequestException()
    }

    const comments = result.value.comments

    return { comments: comments.map(CommentWithAuthorPresenter.toHTTP) }
  }
}
