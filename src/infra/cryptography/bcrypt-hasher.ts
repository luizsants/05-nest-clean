import { HashComparer } from '@/domain/forum/application/cryptography/hash-comparer'
import { HashGenerator } from '@/domain/forum/application/cryptography/hash-generator'
import { compare, hash } from 'bcryptjs'

export class BcryptHasher implements HashGenerator, HashComparer {
  private HASH_SALT_LENGTH = 8

  hash(plain: string): Promise<string> {
    return hash(plain, this.HASH_SALT_LENGTH)
  }

  compare(plain: string, hashed: string): Promise<boolean> {
    return compare(plain, hashed)
  }
}



ACIMA DE TUDO - Perguntar chico autorizacao pra comecar 

katrine pra rodar 1 limits

Pedir vamsi mandar 2 deals - testa se chega no flex

Marcao
sabino  
katrine - semana que vem disponivel? 
vamsi 