/* eslint-disable @typescript-eslint/no-unused-vars */

import { QuestionAttachmentsRepository } from '@/domain/forum/application/repositories/question-attachments-repository'
import { QuestionAttachment } from '@/domain/forum/enterprise/entities/question-attachment'
import { Injectable } from '@nestjs/common'
import { PrismaQuestionAttachmentMapper } from '../mappers/prisma-question-attachment-mapper'
import { PrismaService } from '../prisma.service'
import { Attachment } from '@/domain/forum/enterprise/entities/attachment'

@Injectable()
export class PrismaQuestionAttachmentsRepository implements QuestionAttachmentsRepository {
  constructor(private prisma: PrismaService) {}

  async findManyByQuestionId(
    questionId: string,
  ): Promise<QuestionAttachment[]> {
    const questionAttachments = await this.prisma.attachment.findMany({
      where: { questionId },
    })

    return questionAttachments.map(PrismaQuestionAttachmentMapper.toDomain)
  }

  async deleteManyByQuestionId(questionId: string): Promise<void> {
    await this.prisma.attachment.deleteMany({
      where: { questionId },
    })
  }

  async createMany(attachments: QuestionAttachment[]): Promise<void> {
    if (attachments.length === 0) return

    await Promise.all(
      attachments.map((attachment) =>
        this.prisma.attachment.update({
          where: { id: attachment.attachmentId.toString() },
          data: { questionId: attachment.questionId.toString() },
        }),
      ),
    )
  }

  async deleteMany(attachments: QuestionAttachment[]): Promise<void> {
    if (attachments.length === 0) return

    const attachmentIds = attachments.map((a) => a.attachmentId.toString())

    await this.prisma.attachment.deleteMany({
      where: { id: { in: attachmentIds } },
    })
  }
}
