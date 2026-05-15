import { Module } from '@nestjs/common';
import { LenderService } from './lender.service';
import { LenderController } from './lender.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MailService } from '../mail/mail.service'; // <-- 1. Import the MailService

@Module({
  imports: [PrismaModule],
  controllers: [LenderController],
  providers: [LenderService, MailService],
})
export class LenderModule {}