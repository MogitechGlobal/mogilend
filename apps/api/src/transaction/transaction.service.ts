import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  async findAll(lenderId: string, type?: string) {
    if (!lenderId) return [];

    // 1. Fetch actual payment transactions
    const transactions = await this.prisma.transaction.findMany({
      where: {
        ...(type && { type }),
        loan: { lender_id: lenderId } 
      },
      include: {
        loan: {
          include: { borrower: true } 
        }
      }
    });

    let allRecords: any[] = [...transactions];

    // 2. Fetch Disbursed Loans and map them seamlessly into "Transaction" records
    if (!type || type === 'DISBURSEMENT') {
        const disbursedLoans = await this.prisma.loan.findMany({
            where: {
                lender_id: lenderId,
                status: { in: ['DISBURSED', 'COMPLETED', 'DEFAULTED'] }
            },
            include: { borrower: true }
        });

        const mappedDisbursements = disbursedLoans.map(loan => ({
            id: `disb-${loan.id}`,
            loan_id: loan.id,
            amount: loan.principal_amount, // Map principal to transaction amount
            type: 'DISBURSEMENT',
            transaction_date: loan.disbursed_at || loan.created_at,
            created_at: loan.disbursed_at || loan.created_at,
            reference_code: `DISB-${loan.id.substring(0, 6).toUpperCase()}`,
            description: 'Principal Disbursement',
            loan: loan // Attach the full loan object so frontend hierarchy mapping works
        }));

        allRecords = [...allRecords, ...mappedDisbursements];
    }

    // 3. Sort everything chronologically (newest first)
    allRecords.sort((a, b) => {
        const dateA = new Date(a.transaction_date || a.created_at).getTime();
        const dateB = new Date(b.transaction_date || b.created_at).getTime();
        return dateB - dateA;
    });

    return allRecords;
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
      throw new BadRequestException('Can only record payments for active or defaulted loans.');
    }

    const repaymentAmount = Number(data.amount);
    if (isNaN(repaymentAmount) || repaymentAmount <= 0) {
      throw new BadRequestException('Invalid repayment amount.');
    }

    // ACID Transaction for financial integrity
    return this.prisma.$transaction(async (tx) => {
      const newBalance = loan.outstanding_balance - repaymentAmount;

      const updatedLoan = await tx.loan.update({
        where: { id: loan.id },
        data: {
          outstanding_balance: Math.max(0, newBalance),
          status: newBalance <= 0 ? 'COMPLETED' : loan.status,
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          loan_id: loan.id,
          amount: repaymentAmount,
          type: 'REPAYMENT',
          reference_code: data.reference_code,
          description: data.description || 'Standard Repayment',
          transaction_date: data.transaction_date ? new Date(data.transaction_date) : new Date(),
        },
      });

      return { transaction, updatedLoan };
    });
  }

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
      
      const newBalance = transaction.loan.outstanding_balance + transaction.amount;
      
      const newStatus = (newBalance > 0 && transaction.loan.status === 'COMPLETED') 
        ? 'DISBURSED' 
        : transaction.loan.status;

      await tx.loan.update({
        where: { id: transaction.loan_id },
        data: {
          outstanding_balance: newBalance,
          status: newStatus
        }
      });

      return tx.transaction.delete({
        where: { id: transactionId }
      });
    });
  }
}