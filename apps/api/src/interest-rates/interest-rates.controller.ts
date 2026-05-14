import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { InterestRatesService } from './interest-rates.service';

@Controller('v1/interest-rates')
export class InterestRatesController {
  constructor(private readonly interestRatesService: InterestRatesService) {}

  @Post()
  create(@Body() createInterestRateDto: any) {
    return this.interestRatesService.create(createInterestRateDto);
  }

  @Get()
  findAll(@Query('lender_id') lender_id: string) {
    if (!lender_id) {
      return []; // Return empty if no lender context is provided
    }
    return this.interestRatesService.findAll(lender_id);
  }
}