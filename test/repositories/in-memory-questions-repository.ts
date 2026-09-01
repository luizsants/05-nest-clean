import { DomainEvents } from '@/core/events/domain-events'
import { QuestionAttachmentsRepository } from '@/domain/forum/application/repositories/question-attachments-repository'
import {
  FindManyRecentParams,
  QuestionsRepository,
} from '@/domain/forum/application/repositories/questions-repository'
import { Question } from '@/domain/forum/enterprise/entities/question'
import { QuestionDetails } from '@/domain/forum/enterprise/entities/value-objects/question-details'
import { InMemoryStudentsRepository } from './in-memory-students-repository'
import { InMemoryAttachmentsRepository } from './in-memory-attachments-repository'
import { Attachment } from '@/domain/forum/enterprise/entities/attachment'

export class InMemoryQuestionsRepository implements QuestionsRepository {
  public items: Question[] = []

  constructor(
    private questionAttachmentsRepository: QuestionAttachmentsRepository,
    private studentsRepository?: InMemoryStudentsRepository,
    private attachmentsRepository?: InMemoryAttachmentsRepository,
  ) {}

  async findById(id: string) {
    const question = this.items.find((item) => item.id.toString() === id)

    if (!question) {
      return null
    }
    return question
  }

  async findBySlug(slug: string) {
    const question = this.items.find((item) => item.slug.value === slug)

    if (!question) {
      return null
    }
    return question
  }

  async findDetailsBySlug(slug: string): Promise<QuestionDetails | null> {
    const question = this.items.find((item) => item.slug.value === slug)

    if (!question) {
      return null
    }

    const author = this.studentsRepository?.items.find((student) =>
      student.id.equals(question.authorId),
    )

    if (!author) {
      throw new Error(
        `Author with ID "${question.authorId.toString()}" does not exist.`,
      )
    }

    const questionAttachments =
      await this.questionAttachmentsRepository.findManyByQuestionId(
        question.id.toString(),
      )

    const attachments = questionAttachments.map((questionAttachment) => {
      const attachment = this.attachmentsRepository?.items.find((a) =>
        a.id.equals(questionAttachment.attachmentId),
      )

      if (!attachment) {
        throw new Error(
          `Attachment with ID "${questionAttachment.attachmentId.toString()}" does not exist.`,
        )
      }

      return attachment
    })

    return QuestionDetails.create({
      questionId: question.id,
      authorId: question.authorId,
      author: author.name,
      title: question.title,
      content: question.content,
      slug: question.slug,
      category: question.category,
      attachments,
      bestAnswerId: question.bestAnswerId,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
    })
  }

  async findManyRecent({ page, search, category }: FindManyRecentParams) {
    let questions = this.items.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )

    if (search) {
      const lower = search.toLowerCase()
      questions = questions.filter(
        (q) =>
          q.title.toLowerCase().includes(lower) ||
          q.content.toLowerCase().includes(lower),
      )
    }

    if (category) {
      questions = questions.filter((q) => q.category === category)
    }

    return questions.slice((page - 1) * 20, page * 20)
  }

  async create(question: Question) {
    this.items.push(question)

    await this.questionAttachmentsRepository.createMany(
      question.attachments.getItems(),
    )
    DomainEvents.dispatchEventsForAggregate(question.id)
  }

  async save(question: Question) {
    const itemIndex = this.items.findIndex((item) => item.id === question.id)
    this.items[itemIndex] = question

    await this.questionAttachmentsRepository.createMany(
      question.attachments.getNewItems(),
    )

    await this.questionAttachmentsRepository.deleteMany(
      question.attachments.getRemovedItems(),
    )

    DomainEvents.dispatchEventsForAggregate(question.id)
  }

  async delete(question: Question) {
    const itemIndex = this.items.findIndex((item) => item.id === question.id)
    this.items.splice(itemIndex, 1)
    this.questionAttachmentsRepository.deleteManyByQuestionId(
      question.id.toString(),
    )
  }
}
