import { Injectable } from '@nestjs/common'
import { PrismaClient } from '../../generated/prisma/client.js'

@Injectable()
export class PrismaService {
  public client: PrismaClient

  constructor() {
    this.client = new PrismaClient()
  }
}
