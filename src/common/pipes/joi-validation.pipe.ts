import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { ObjectSchema, ValidationOptions } from 'joi';

@Injectable()
export class JoiValidationPipe implements PipeTransform {
  constructor(
    private readonly schema: ObjectSchema,
    private readonly options?: ValidationOptions,
  ) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    const { error, value: validated } = this.schema.validate(value, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
      ...this.options,
    });

    if (error) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: error.details.map((detail) => detail.message),
      });
    }

    return validated;
  }
}
