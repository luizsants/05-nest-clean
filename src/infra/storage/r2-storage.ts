import { Uploader } from '@/domain/forum/application/storage/uploader'

export class R2Storage implements Uploader {
  client
  async upload(
    fileName: string,
    fileType: string,
    body: Buffer,
  ): Promise<string> {}
}
