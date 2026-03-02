import { InMemoryAttachmentsRepository } from 'test/repositories/in-memory-attachments-repository'
import { UploadAndCreateAttachmentUseCase } from './upload-and-create-attachment'
import { FakeUploader } from 'test/storage/fake-uploader'

let inMemoryAttachmentsRepository: InMemoryAttachmentsRepository
let fakeUploader: FakeUploader

let sut: UploadAndCreateAttachmentUseCase

describe('Upload and create attachment', () => {
  beforeEach(() => {
    inMemoryAttachmentsRepository = new InMemoryAttachmentsRepository()
    fakeUploader = new FakeUploader()

    sut = new UploadAndCreateAttachmentUseCase(
      inMemoryAttachmentsRepository,
      fakeUploader,
    )
  })
  // sut = system under test

  it('should be able to upload and create an attachment', async () => {
    const result = await sut.execute({
      fileName: 'img.png',
      fileType: 'image/png',
      body: Buffer.from(''),
    })

    expect(result.isRight()).toBe(true)
    expect(result.value).toEqual({
      attachment: inMemoryAttachmentsRepository.items[0],
    })
    expect(fakeUploader.uploads).toHaveLength(1)
    expect(fakeUploader.uploads[0]).toEqual({
      fileName: 'img.png',
      url: fakeUploader.uploads[0].url,
    })
  })

  //   it('should hash student password upon registration', async () => {
  //     const result = await sut.execute({
  //       name: 'John Doe',
  //       email: 'john.doe@example.com',
  //       password: '123456',
  //     })

  //     const hashedPassword = await fakeHasher.hash('123456')

  //     expect(result.isRight()).toBe(true)
  //     expect(inMemoryStudentsRepository.items[0].password).toEqual(hashedPassword)
  //   })
})
