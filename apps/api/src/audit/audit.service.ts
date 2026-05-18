import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';


@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async createLog(data: {
    user_id?: string;
    lender_id?: string;
    action: string;
    entity_type: string;
    entity_id?: string;
    details?: any;
    ip_address?: string;
  }) {
    return this.prisma.auditLog.create({
      data: { ...data, details: data.details || {} }
    });
  }

  // --- UPGRADED: Added Pagination and Search matching your reference ---
  async getLedger(user: any, queryLenderId?: string, page: number = 1, search: string = '') {
    const limit = 50;
    const skip = (page - 1) * limit;
    const whereClause: any = {};

    // 1. Strict Tenant Isolation
    if (user.role === 'Super Admin') {
      if (queryLenderId) whereClause.lender_id = queryLenderId;
    } else if (user.role === 'Lender Admin') {
      whereClause.lender_id = user.lender_id;
    } else {
      throw new ForbiddenException('You do not have clearance to view the Audit Ledger.');
    }

    // 2. Relational Search
    if (search) {
      whereClause.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { entity_type: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const logs = await this.prisma.auditLog.findMany({
      where: whereClause,
      include: {
        user: { select: { first_name: true, last_name: true, email: true, role: { select: { name: true } } } },
        lender: { select: { name: true } }
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    });

    const total = await this.prisma.auditLog.count({ where: whereClause });

    return {
      data: logs,
      meta: { total, page, last_page: Math.ceil(total / limit) }
    };
  }
  
}