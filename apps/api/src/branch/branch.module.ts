import { Module } from '@nestjs/common';
import { BranchService } from './branch.service';
import { BranchController } from './branch.controller';
import { PrismaModule } from '../prisma/prisma.module'; // Adjust path if necessary

@Module({
  imports: [PrismaModule],
  controllers: [BranchController],
  providers: [BranchService],
  exports: [BranchService], // Optional: Export if other modules need to fetch branches
})
export class BranchModule {}