import { HashComparer } from '@/domain/forum/application/cryptography/hash-comparer'
import { HashGenerator } from '@/domain/forum/application/cryptography/hash-generator'

export class FakeHasher implements HashGenerator, HashComparer {
  compare(plain: string, hashed: string): Promise<boolean> {
    throw new Error('Method not implemented.')
  }

  hash(plain: string): Promise<string> {
    throw new Error('Method not implemented.')
  }
}
