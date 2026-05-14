import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLenderDto } from './dto/create-lender.dto';

@Injectable()
export class LenderService {
  constructor(private prisma: PrismaService) {}

  async onboardLender(data: CreateLenderDto) {
    const existingLender = await this.prisma.lender.findUnique({
      where: { email: data.email },
    });

    if (existingLender) {
      throw new ConflictException('A lender with this email already exists.');
    }

    // Execute as an atomic transaction for relational integrity [cite: 98]
    return this.prisma.$transaction(async (tx) => {
      // 1. Create the root Lender organization [cite: 253]
      const lender = await tx.lender.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          tax_pin: data.tax_pin,
          registration_number: data.registration_number,
          status: 'ACTIVE', 
        },
      });

      // 2. Provision the default Headquarters branch [cite: 254]
      const branch = await tx.branch.create({
        data: {
          lender_id: lender.id,
          name: 'Headquarters',
          location: data.location || 'Nairobi',
        },
      });

      return { lender, default_branch: branch };
    });
  }

  async getAllLenders() {
    return this.prisma.lender.findMany({
      include: { branches: true },
      orderBy: { created_at: 'desc' }
    });
  }
}