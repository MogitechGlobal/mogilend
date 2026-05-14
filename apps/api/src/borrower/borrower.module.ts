import { Module } from '@nestjs/common';
import { BorrowerService } from './borrower.service';
import { BorrowerController } from './borrower.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module'; // Import the new module

@Module({
  imports: [
    PrismaModule,     // Required for database access
    CloudinaryModule  // Required for KYC uploads
  ],
  controllers: [BorrowerController],
  providers: [BorrowerService], // Register the service here
})
export class BorrowerModule {}