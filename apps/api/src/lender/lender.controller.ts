import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { LenderService } from './lender.service';
import { CreateLenderDto } from './dto/create-lender.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // You will create this standard guard
import { RolesGuard } from '../auth/roles.guard';       // Custom RBAC guard
import { Roles } from '../auth/roles.decorator';

@Controller('v1/lenders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LenderController {
  constructor(private readonly lenderService: LenderService) {}

  @Post()
  @Roles('Super Admin') // Only platform owners can onboard new organizations
  async createLender(@Body() createLenderDto: CreateLenderDto) {
    return this.lenderService.onboardLender(createLenderDto);
  }

  @Get()
  @Roles('Super Admin')
  async getLenders() {
    return this.lenderService.getAllLenders();
  }
}