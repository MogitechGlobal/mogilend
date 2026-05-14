import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Adjust path if necessary

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
}