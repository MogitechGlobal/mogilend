import { Controller, Get, Post, Body, Query, Patch, Param, Delete, UseGuards, Request as NestRequest } from '@nestjs/common';
import { InterestRatesService } from './interest-rates.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('v1/interest-rates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InterestRatesController {
  constructor(private readonly interestRatesService: InterestRatesService) {}

  @Post()
  @Roles('Super Admin', 'Lender Admin') // Restricted
  create(@NestRequest() req: any, @Body() createInterestRateDto: any) {
    // Force lender_id to current admin's tenant to prevent spoofing
    if (req.user.role !== 'Super Admin') {
      createInterestRateDto.lender_id = req.user.lender_id;
    }
    return this.interestRatesService.create(createInterestRateDto);
  }

  @Get()
  findAll(@NestRequest() req: any, @Query('lender_id') lender_id: string) {
    const targetLender = req.user.role === 'Super Admin' ? lender_id : req.user.lender_id;
    if (!targetLender) return [];
    return this.interestRatesService.findAll(targetLender);
  }

  @Patch(':id')
  @Roles('Super Admin', 'Lender Admin') // Restricted
  update(@NestRequest() req: any, @Param('id') id: string, @Body() updateData: any) {
    return this.interestRatesService.update(id, updateData, req.user);
  }

  @Delete(':id')
  @Roles('Super Admin', 'Lender Admin') // Restricted
  remove(@NestRequest() req: any, @Param('id') id: string) {
    return this.interestRatesService.remove(id, req.user);
  }
}