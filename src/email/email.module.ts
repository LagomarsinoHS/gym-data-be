import { Module } from '@nestjs/common';
import { EMAIL_SERVICE } from './email.tokens';
import { ResendEmailProvider } from './providers/resend.provider';

@Module({
  providers: [
    ResendEmailProvider,
    {
      provide: EMAIL_SERVICE,
      useExisting: ResendEmailProvider,
    },
  ],
  exports: [EMAIL_SERVICE],
})
export class EmailModule {}
