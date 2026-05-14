import { Module } from '@nestjs/common';
import { InterestRatesService } from './interest-rates.service';
import { InterestRatesController } from './interest-rates.controller';
import { PrismaModule } from '../prisma/prisma.module'; // 1. Import PrismaModule

@Module({
  imports: [PrismaModule], // 2. Add PrismaModule to the imports array
  controllers: [InterestRatesController],
  providers: [InterestRatesService],
})
export class InterestRatesModule {}