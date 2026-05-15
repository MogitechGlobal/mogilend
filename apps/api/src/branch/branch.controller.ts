import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request as NestRequest } from '@nestjs/common';
import { BranchService } from './branch.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('v1/branches')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Post()
  @Roles('Super Admin', 'Lender Admin') // Only Admins can create branches
  async createBranch(@NestRequest() req: any, @Body() data: any) {
    return this.branchService.createBranch(req.user, data);
  }

  @Get()
  // No @Roles decorator needed here so Loan Officers/Cashiers can fetch the list for dropdowns
  async getBranches(@NestRequest() req: any, @Query('lender_id') lenderId?: string) {
    return this.branchService.getBranches(req.user, lenderId);
  }

  @Patch(':id')
  @Roles('Super Admin', 'Lender Admin')
  async updateBranch(@NestRequest() req: any, @Param('id') id: string, @Body() data: any) {
    return this.branchService.updateBranch(req.user, id, data);
  }

  @Delete(':id')
  @Roles('Super Admin', 'Lender Admin')
  async deleteBranch(@NestRequest() req: any, @Param('id') id: string) {
    return this.branchService.deleteBranch(req.user, id);
  }
}