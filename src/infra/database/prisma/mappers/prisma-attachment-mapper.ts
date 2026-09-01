import {
  Prisma,
  Attachment as PrismaAttachmentModel,
} from '@/../generated/prisma/client'
import { Attachment } from '@/domain/forum/enterprise/entities/attachment'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

export class PrismaAttachmentMapper {
  static toDomain(raw: PrismaAttachmentModel): Attachment {
    return Attachment.create(
      {
        title: raw.title,
        url: raw.url,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPrisma(
    attachment: Attachment,
  ): Prisma.AttachmentUncheckedCreateInput {
    return {
      id: attachment.id.toString(),
      title: attachment.title,
      url: attachment.url,
    }
  }
}
