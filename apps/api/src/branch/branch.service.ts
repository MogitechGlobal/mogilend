// apps/api/src/branch/branch.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BranchService {
  constructor(private prisma: PrismaService) {}

  async findAllByLender(lenderId: string) {
    // Fetch all branches for this specific SaaS tenant
    return this.prisma.branch.findMany({
      where: { 
        lender_id: lenderId 
        // Removed is_active: true to match your database schema
      },
      orderBy: { name: 'asc' }
    });
  }
}