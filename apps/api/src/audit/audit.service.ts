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

  // UPGRADED: Full server-side filtering
  async getLedger(user: any, queryLenderId?: string, page: number = 1, search: string = '', filters?: { start?: string, end?: string, risk?: string }) {
    const limit = 50;
    const skip = (page - 1) * limit;
    
    // Use an AND array to combine multiple strict conditions cleanly
    const whereClause: any = { AND: [] };

    // 1. Strict Tenant Isolation
    if (user.role === 'Super Admin') {
      if (queryLenderId) whereClause.AND.push({ lender_id: queryLenderId });
    } else if (user.role === 'Lender Admin') {
      whereClause.AND.push({ lender_id: user.lender_id });
    } else {
      throw new ForbiddenException('You do not have clearance to view the Audit Ledger.');
    }

    // 2. Relational Text Search
    if (search) {
      whereClause.AND.push({
        OR: [
          { action: { contains: search, mode: 'insensitive' } },
          { entity_type: { contains: search, mode: 'insensitive' } },
          { user: { email: { contains: search, mode: 'insensitive' } } }
        ]
      });
    }

    // 3. Database-Level Date Filtering
    if (filters?.start) {
        const startDate = new Date(filters.start);
        const endDate = filters.end ? new Date(`${filters.end}T23:59:59.999Z`) : new Date();
        whereClause.AND.push({
            created_at: { gte: startDate, lte: endDate }
        });
    }

    // 4. Database-Level Risk Filtering
    if (filters?.risk === 'HIGH_RISK') {
        whereClause.AND.push({
            OR: [
                { action: { contains: 'DELETE', mode: 'insensitive' } },
                { action: { contains: 'SUSPEND', mode: 'insensitive' } },
                { action: { contains: 'REJECT', mode: 'insensitive' } },
                { action: { contains: 'IMPERSONATE', mode: 'insensitive' } }
            ]
        });
    } else if (filters?.risk === 'STANDARD') {
        whereClause.AND.push({
            NOT: {
                OR: [
                    { action: { contains: 'DELETE', mode: 'insensitive' } },
                    { action: { contains: 'SUSPEND', mode: 'insensitive' } },
                    { action: { contains: 'REJECT', mode: 'insensitive' } },
                    { action: { contains: 'IMPERSONATE', mode: 'insensitive' } }
                ]
            }
        });
    }

    // Cleanup empty AND array
    if (whereClause.AND.length === 0) {
        delete whereClause.AND;
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
      meta: { total, page, last_page: Math.ceil(total / limit) || 1 }
    };
  }
}