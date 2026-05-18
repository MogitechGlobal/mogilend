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

  async findOne(id: string, user: any) {
    const product = await this.prisma.loanProduct.findUnique({
      where: { id }
    });

    if (!product) {
      throw new NotFoundException('Loan Product not found.');
    }

    // Tenant Isolation
    if (user.role !== 'Super Admin' && product.lender_id !== user.lender_id) {
      throw new ForbiddenException('You do not have permission to view this product.');
    }

    return product;
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

  async update(id: string, user: any, data: any) {
    const product = await this.prisma.loanProduct.findUnique({
      where: { id }
    });

    if (!product) {
      throw new NotFoundException('Loan Product not found.');
    }

    // Tenant Isolation Check
    if (user.role !== 'Super Admin' && product.lender_id !== user.lender_id) {
      throw new ForbiddenException('You do not have permission to update this product.');
    }

    return this.prisma.loanProduct.update({
      where: { id },
      data: {
        name: data.name,
        // Optional description fallback
        description: data.description !== undefined ? data.description : product.description, 
        interest_rate: parseFloat(data.interest_rate),
        interest_type: data.interest_type,
        repayment_cycle: data.repayment_cycle,
        min_amount: parseFloat(data.min_amount),
        max_amount: parseFloat(data.max_amount),
        default_term: parseInt(data.default_term, 10),
        penalty_rate: parseFloat(data.penalty_rate || 0),
        
        // FIX: Map the frontend 'status' string to the database 'is_active' boolean
        is_active: data.status === 'ACTIVE', 
      },
    });
  }

  async remove(id: string, user: any) {
    const product = await this.prisma.loanProduct.findUnique({
      where: { id }
    });

    if (!product) {
      throw new NotFoundException('Loan Product not found.');
    }

    // Tenant Isolation Check
    if (user.role !== 'Super Admin' && product.lender_id !== user.lender_id) {
      throw new ForbiddenException('You do not have permission to delete this product.');
    }

    // Delete the product permanently
    return this.prisma.loanProduct.delete({
      where: { id }
    });
  }
}