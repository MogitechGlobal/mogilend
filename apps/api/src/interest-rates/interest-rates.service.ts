import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InterestRatesService {
  constructor(private prisma: PrismaService) {}

  async create(createInterestRateDto: any) {
    return this.prisma.interestRate.create({
      data: {
        profile_name: createInterestRateDto.profile_name,
        calculation_method: createInterestRateDto.calculation_method,
        base_rate: parseFloat(createInterestRateDto.base_rate),
        penalty_rate: parseFloat(createInterestRateDto.penalty_rate),
        compounding_frequency: createInterestRateDto.compounding_frequency,
        status: createInterestRateDto.status || 'Active',
        lender_id: createInterestRateDto.lender_id,
      },
    });
  }

  async findAll(lender_id: string) {
    return this.prisma.interestRate.findMany({
      where: { lender_id },
      orderBy: { created_at: 'desc' },
    });
  }

  // --- NEW: EDIT LOGIC ---
  async update(id: string, updateData: any, user: any) {
    const rate = await this.prisma.interestRate.findUnique({ where: { id } });
    if (!rate) throw new NotFoundException('Interest rate profile not found.');

    // Tenant Isolation
    if (user.role !== 'Super Admin' && rate.lender_id !== user.lender_id) {
      throw new ForbiddenException('You do not have permission to modify this profile.');
    }

    return this.prisma.interestRate.update({
      where: { id },
      data: {
        profile_name: updateData.profile_name,
        calculation_method: updateData.calculation_method,
        base_rate: parseFloat(updateData.base_rate),
        penalty_rate: parseFloat(updateData.penalty_rate),
        compounding_frequency: updateData.compounding_frequency,
        status: updateData.status,
      }
    });
  }

  // --- NEW: DELETE LOGIC ---
  async remove(id: string, user: any) {
    const rate = await this.prisma.interestRate.findUnique({ where: { id } });
    if (!rate) throw new NotFoundException('Interest rate profile not found.');

    // Tenant Isolation
    if (user.role !== 'Super Admin' && rate.lender_id !== user.lender_id) {
      throw new ForbiddenException('You do not have permission to delete this profile.');
    }

    return this.prisma.interestRate.delete({ where: { id } });
  }
}