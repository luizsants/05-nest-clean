import { PaginationParams } from '@/core/repositories/pagination-params'
import { Question } from '../../enterprise/entities/question'
import { QuestionDetails } from '../../enterprise/entities/value-objects/question-details'

export interface FindManyRecentParams extends PaginationParams {
  search?: string
  category?: string
}

export abstract class QuestionsRepository {
  abstract findById(id: string): Promise<Question | null>
  abstract findBySlug(slug: string): Promise<Question | null>
  abstract findDetailsBySlug(slug: string): Promise<QuestionDetails | null>
  abstract findManyRecent(params: FindManyRecentParams): Promise<Question[]>
  abstract save(question: Question): Promise<void>
  abstract create(question: Question): Promise<void>
  abstract delete(question: Question): Promise<void>
}
