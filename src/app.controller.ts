import { Controller, Get, Post } from '@nestjs/common'
import { AppService } from './app.service'

@Controller('/api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/test')
  index(): string {
    return this.appService.getHello()
  }
  @Post('/test')
  hello(): string {
    return this.appService.getHello()
  }
}
