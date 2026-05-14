import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  // --- THIS WAS MISSING: Fetch transactions with related Loan and Borrower info ---
  async findAll(lenderId: string, type?: string) {
    if (!lenderId) return [];

    return this.prisma.transaction.findMany({
      where: {
        ...(type && { type }),
        loan: { lender_id: lenderId } 
      },
      include: {
        loan: {
          include: { borrower: true } 
        }
      },
      orderBy: { transaction_date: 'desc' }
    });
  }

  async recordRepayment(user: any, data: any) {
    const lenderId = user.role === 'Super Admin' ? data.lender_id : user.lender_id;
    if (!lenderId) throw new ForbiddenException('Lender ID is required.');

    const loan = await this.prisma.loan.findFirst({
      where: { id: data.loan_id, lender_id: lenderId },
    });

    if (!loan) {
      throw new NotFoundException('Loan not found or unauthorized.');
    }

    if (loan.status !== 'DISBURSED' && loan.status !== 'DEFAULTED') {
      throw new BadRequestException(`Cannot record repayment for a loan with status: ${loan.status}`);
    }

    const repaymentAmount = parseFloat(data.amount);
    if (repaymentAmount <= 0) {
      throw new BadRequestException('Repayment amount must be greater than zero.');
    }

    if (repaymentAmount > loan.outstanding_balance) {
      throw new BadRequestException(`Repayment of KES ${repaymentAmount} exceeds the outstanding balance of KES ${loan.outstanding_balance}.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const transactionRecord = await tx.transaction.create({
        data: {
          loan_id: loan.id,
          reference_code: data.reference_code, 
          amount: repaymentAmount,
          type: 'REPAYMENT',
          description: data.description || 'Manual Repayment',
          transaction_date: data.transaction_date ? new Date(data.transaction_date) : new Date(), 
        },
      });

      const newBalance = loan.outstanding_balance - repaymentAmount;
      const newStatus = newBalance <= 0 ? 'COMPLETED' : loan.status;

      const updatedLoan = await tx.loan.update({
        where: { id: loan.id },
        data: {
          outstanding_balance: newBalance,
          status: newStatus,
        },
      });

      return {
        receipt: transactionRecord,
        loan_summary: updatedLoan,
      };
    });
  }

  // --- NEW: Delete Transaction Logic ---
  async deleteTransaction(user: any, transactionId: string) {
    const lenderId = user.role === 'Super Admin' ? undefined : user.lender_id;

    // 1. Find the transaction and include its parent loan
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { loan: true }
    });

    if (!transaction) throw new NotFoundException('Transaction not found.');

    // 2. Tenant Isolation Check
    if (lenderId && transaction.loan.lender_id !== lenderId) {
      throw new ForbiddenException('Unauthorized to delete this transaction.');
    }

    // 3. ACID Transaction to delete receipt AND reverse the balance
    return this.prisma.$transaction(async (tx) => {
      
      // Calculate the reversed balance
      const newBalance = transaction.loan.outstanding_balance + transaction.amount;
      
      // If the loan was previously marked COMPLETED, but we are deleting a payment, it goes back to DISBURSED
      const newStatus = (newBalance > 0 && transaction.loan.status === 'COMPLETED') 
        ? 'DISBURSED' 
        : transaction.loan.status;

      // Reverse the loan balance
      await tx.loan.update({
        where: { id: transaction.loan_id },
        data: {
          outstanding_balance: newBalance,
          status: newStatus
        }
      });

      // Permanently delete the transaction log
      return tx.transaction.delete({
        where: { id: transactionId }
      });
    });
  }
}