import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BranchService {
  constructor(private prisma: PrismaService) {}

  async createBranch(user: any, data: any) {
    const lenderId = user.role === 'Super Admin' ? data.lender_id : user.lender_id;
    if (!lenderId) throw new BadRequestException('Lender ID is required to create a branch.');

    return this.prisma.branch.create({
      data: {
        lender_id: lenderId,
        name: data.name,
        location: data.location,
      }
    });
  }

  async getBranches(user: any, queryLenderId?: string) {
    const lenderId = user.role === 'Super Admin' ? queryLenderId : user.lender_id;
    if (!lenderId) throw new BadRequestException('Lender ID is required to fetch branches.');

    return this.prisma.branch.findMany({
      where: { lender_id: lenderId },
      include: { 
        // THIS IS THE FIX: Fetch the institution name alongside the branch
        lender: { select: { name: true } }, 
        _count: { 
          select: { users: true, borrowers: true } 
        },
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            is_active: true,
            role: { select: { name: true } }
          }
        }
      },
      orderBy: { created_at: 'asc' }
    });
  }

  async updateBranch(user: any, branchId: string, data: any) {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) throw new NotFoundException('Branch not found.');

    if (user.role !== 'Super Admin' && branch.lender_id !== user.lender_id) {
      throw new ForbiddenException('Unauthorized to modify this branch.');
    }

    return this.prisma.branch.update({
      where: { id: branchId },
      data: { name: data.name, location: data.location }
    });
  }

  async deleteBranch(user: any, branchId: string) {
    const branch = await this.prisma.branch.findUnique({ 
      where: { id: branchId },
      include: { _count: { select: { users: true, borrowers: true } } }
    });
    
    if (!branch) throw new NotFoundException('Branch not found.');
    
    if (user.role !== 'Super Admin' && branch.lender_id !== user.lender_id) {
      throw new ForbiddenException('Unauthorized to delete this branch.');
    }

    // Safety constraint: Prevent deleting branches that have active staff or borrowers
    if (branch._count.users > 0 || branch._count.borrowers > 0) {
      throw new BadRequestException('Cannot delete a branch that has assigned staff or active customers. Please reassign them first.');
    }

    return this.prisma.branch.delete({ where: { id: branchId } });
  }
}