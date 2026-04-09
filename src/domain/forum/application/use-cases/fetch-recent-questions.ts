import { Either, right } from '@/core/either'
import { Question } from '../../enterprise/entities/question'
import { QuestionsRepository } from '../repositories/questions-repository'
import { Injectable } from '@nestjs/common'

interface FetchRecentQuestionsUseCaseRequest {
  page: number
  search?: string
  category?: string
}
type FetchRecentQuestionsUseCaseResponse = Either<
  null,
  {
    questions: Question[]
  }
>

@Injectable()
export class FetchRecentQuestionsUseCase {
  constructor(private questionsRepository: QuestionsRepository) {}

  async execute({
    page,
    search,
    category,
  }: FetchRecentQuestionsUseCaseRequest): Promise<FetchRecentQuestionsUseCaseResponse> {
    const questions = await this.questionsRepository.findManyRecent({
      page,
      search,
      category,
    })

    return right({
      questions,
    })
  }
}
