import { Controller, Get, Query, UseGuards, Request as NestRequest, BadRequestException } from '@nestjs/common';
import { BranchService } from './branch.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('v1/branches')
@UseGuards(JwtAuthGuard)
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Get()
  async getBranches(
    @NestRequest() req: any,
    @Query('lender_id') queryLenderId?: string
  ) {
    let lenderId = req.user.lender_id;

    // Strict tenant isolation check for Super Admins
    if (req.user.role === 'Super Admin') {
      if (!queryLenderId) {
        throw new BadRequestException('Super Admins must provide a ?lender_id= query parameter.');
      }
      lenderId = queryLenderId;
    }

    return this.branchService.findAllByLender(lenderId);
  }
}