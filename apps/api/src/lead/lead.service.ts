import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeadService {
  constructor(private prisma: PrismaService) {}

  async createLead(user: any, data: any) {
    const lenderId = user.role === 'Super Admin' ? data.lender_id : user.lender_id;
    if (!lenderId) throw new BadRequestException('Lender ID is required.');

    return this.prisma.lead.create({
      data: {
        lender_id: lenderId,
        branch_id: data.branch_id || user.branch_id || null,
        first_name: data.first_name,
        last_name: data.last_name,
        phone_number: data.phone_number,
        email: data.email,
        source: data.source || 'Manual Entry',
        notes: data.notes,
        assigned_to: data.assigned_to || null,
      }
    });
  }

  async getLeads(user: any, queryLenderId?: string) {
    const lenderId = user.role === 'Super Admin' ? queryLenderId : user.lender_id;
    
    const whereClause: any = { lender_id: lenderId };
    if (user.role === 'Branch Manager') whereClause.branch_id = user.branch_id;
    if (user.role === 'Loan Officer') whereClause.assigned_to = user.id;

    return this.prisma.lead.findMany({
      where: whereClause,
      include: {
        officer: { select: { first_name: true, last_name: true } },
        branch: { select: { name: true } }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async updateLead(user: any, id: string, data: any) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found.');
    if (user.role !== 'Super Admin' && lead.lender_id !== user.lender_id) {
      throw new ForbiddenException('Unauthorized.');
    }

    return this.prisma.lead.update({
      where: { id },
      data: {
        status: data.status,
        assigned_to: data.assigned_to,
        notes: data.notes,
        branch_id: data.branch_id
      }
    });
  }

  // Converts a lead into an actual Borrower profile
  async convertToBorrower(user: any, id: string, nationalId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found.');

    if (lead.status === 'CONVERTED') throw new BadRequestException('Lead is already converted.');

    const existingBorrower = await this.prisma.borrower.findFirst({
        where: { OR: [{ national_id: nationalId }, { phone_number: lead.phone_number }] }
    });

    if (existingBorrower) throw new ConflictException('A borrower with this National ID or Phone already exists.');

    return this.prisma.$transaction(async (tx) => {
        const newBorrower = await tx.borrower.create({
            data: {
                lender_id: lead.lender_id,
                branch_id: lead.branch_id || user.branch_id,
                user_id: lead.assigned_to || user.id,
                first_name: lead.first_name,
                last_name: lead.last_name,
                phone_number: lead.phone_number,
                email: lead.email,
                national_id: nationalId,
                kyc_status: 'PENDING'
            }
        });

        await tx.lead.update({
            where: { id },
            data: { status: 'CONVERTED' }
        });

        return newBorrower;
    });
  }

  async deleteLead(user: any, id: string) {
    return this.prisma.lead.delete({ where: { id } });
  }
}