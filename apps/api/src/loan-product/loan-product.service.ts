import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LoanProductService {
  constructor(private prisma: PrismaService) {}

  async create(user: any, data: any) {
    // 1. Strict Tenant Isolation
    const lenderId = user.lender_id || data.lender_id;
    
    if (!lenderId) {
      throw new ForbiddenException('A Loan Product must belong to a specific Lender.');
    }

    // 2. Create the unified product configuration
    return this.prisma.loanProduct.create({
      data: {
        name: data.name,
        description: data.description,
        interest_rate: parseFloat(data.interest_rate),
        interest_type: data.interest_type, // 'FLAT' or 'REDUCING_BALANCE'
        repayment_cycle: data.repayment_cycle, // 'DAILY', 'WEEKLY', 'MONTHLY'
        min_amount: parseFloat(data.min_amount),
        max_amount: parseFloat(data.max_amount),
        default_term: parseInt(data.default_term),
        penalty_rate: parseFloat(data.penalty_rate || 0),
        lender_id: lenderId,
      },
    });
  }

  async findAllByLender(lenderId: string) {
    // This replaces the legacy `SELECT * FROM loan_products`
    return this.prisma.loanProduct.findMany({
      where: { lender_id: lenderId },
      orderBy: { created_at: 'desc' }
    });
  }

  async toggleStatus(productId: string, lenderId: string) {
    const product = await this.prisma.loanProduct.findFirst({
      where: { id: productId, lender_id: lenderId }
    });

    if (!product) throw new NotFoundException('Product not found or unauthorized.');

    return this.prisma.loanProduct.update({
      where: { id: productId },
      data: { is_active: !product.is_active }
    });
  }
}