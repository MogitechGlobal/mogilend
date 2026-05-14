import { Module } from '@nestjs/common';
import { LoanService } from './loan.service';
import { LoanController } from './loan.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule], // Required to inject PrismaService
  controllers: [LoanController],
  providers: [LoanService],
})
export class LoanModule {}