import { Controller, Get, Post } from '@nestjs/common'
import { AppService } from './app.service.js'
import { PrismaService } from './prisma/prisma.service.js'

@Controller('/api')
export class AppController {
  constructor(
    private readonly appService: AppService,
    private prisma: PrismaService,
  ) {}

  @Get('/test')
  index(): string {
    return this.appService.getHello()
  }

  @Post('/test')
  async hello() {
    return await this.prisma.client.user.findMany()
  }
}
