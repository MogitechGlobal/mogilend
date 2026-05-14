import { Module } from '@nestjs/common';
import { LoanProductService } from './loan-product.service';
import { LoanProductController } from './loan-product.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LoanProductController],
  providers: [LoanProductService],
})
export class LoanProductModule {}