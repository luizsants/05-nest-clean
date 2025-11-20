import { PipeTransform, BadRequestException } from '@nestjs/common'
import { z } from 'zod'
import { fromZodError } from 'zod-validation-error'

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: z.ZodType<any>) {}

  transform(value: unknown) {
    try {
      const parsedValue = this.schema.parse(value)
      return parsedValue
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Forma NOVA e recomendada (Zod v4+)
        const formatted = z.treeifyError(error)

        throw new BadRequestException({
          message: 'Validation failed',
          statusCode: 400,
          //   errors: formatted,           // ← muito mais legível que o .format() antigo
          //   errors: z.treeifyError(error), // direto!
          errors: fromZodError(error), // ← usando zod-validation-error
        })
      }
      throw new BadRequestException('Validation failed')
    }
  }
}
