import { PipeTransform, BadRequestException } from '@nestjs/common'
import { z } from 'zod'

export class ZodValidationPipe implements PipeTransform {
  // constructor(private schema: z.ZodType<any>) {}
  constructor(private schema: z.ZodSchema) {}

  transform(value: unknown) {
    try {
      const parsedValue = this.schema.parse(value)
      return parsedValue
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new BadRequestException({
          message: 'Validation failed',
          statusCode: 400,
          errors: z.prettifyError(error),
        })
      }
      throw new BadRequestException('Validation failed')
    }
  }
}
