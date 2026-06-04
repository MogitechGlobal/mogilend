import { Module } from '@nestjs/common';
import { LeadService } from './lead.service';
import { LeadController } from './lead.controller';
// Ensure PrismaModule is imported so the service can talk to the database
import { PrismaModule } from '../prisma/prisma.module'; 

@Module({
  imports: [PrismaModule],
  controllers: [LeadController],
  providers: [LeadService],
  exports: [LeadService], // Optional: if other modules ever need to use the LeadService
})
export class LeadModule {}