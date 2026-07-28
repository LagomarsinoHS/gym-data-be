import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().port().default(3000),
  MONGODB_URI: Joi.string().min(1).required().messages({
    'any.required': 'Missing required environment variable: MONGODB_URI',
    'string.empty': 'Missing required environment variable: MONGODB_URI',
  }),
  MONGODB_DATABASE: Joi.string().min(1).required().messages({
    'any.required': 'Missing required environment variable: MONGODB_DATABASE',
    'string.empty': 'Missing required environment variable: MONGODB_DATABASE',
  }),
  CORS_ORIGINS: Joi.string().allow('').optional(),
});
