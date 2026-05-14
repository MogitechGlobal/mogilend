import { Module } from '@nestjs/common';
import { LenderService } from './lender.service';
import { LenderController } from './lender.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LenderController],
  providers: [LenderService],
})
export class LenderModule {}