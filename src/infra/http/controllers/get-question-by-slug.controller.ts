import { BadRequestException, Controller, Get, Param } from '@nestjs/common'
import { QuestionPresenter } from '../presenters/question-presenter'
import { GetQuestionBySlugUseCase } from '@/domain/forum/application/use-cases/get-question-by-slug'
import { PrismaService } from '@/infra/database/prisma/prisma.service'

@Controller('/questions/:slug')
export class GetQuestionBySlugController {
  constructor(
    private getQuestionBySlug: GetQuestionBySlugUseCase,
    private prisma: PrismaService,
  ) {}

  @Get()
  async handle(@Param('slug') slug: string) {
    const result = await this.getQuestionBySlug.execute({
      slug,
    })

    if (result.isLeft()) {
      throw new BadRequestException()
    }

    const question = result.value.question

    const author = await this.prisma.user.findUnique({
      where: { id: question.authorId.toString() },
      select: { name: true },
    })

    return {
      question: {
        ...QuestionPresenter.toHTTP(question),
        authorId: question.authorId.toString(),
        authorName: author?.name ?? null,
      },
    }
  }
}
