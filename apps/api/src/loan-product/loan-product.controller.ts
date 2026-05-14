import { 
  Controller, 
  Post, 
  Get, 
  Patch, 
  Param, 
  Body, 
  Query, 
  UseGuards, 
  Request as NestRequest, 
  BadRequestException 
} from '@nestjs/common';
import { LoanProductService } from './loan-product.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('v1/loan-products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoanProductController {
  constructor(private readonly loanProductService: LoanProductService) {}

  @Post()
  @Roles('Super Admin', 'Lender Admin') // Restrict creation to Admins
  async createProduct(@NestRequest() req: any, @Body() data: any) {
    return this.loanProductService.create(req.user, data);
  }

  @Get()
  @Roles('Super Admin', 'Lender Admin', 'Loan Officer')
  async getProducts(
    @NestRequest() req: any, 
    @Query('lender_id') queryLenderId?: string
  ) {
    // Determine the correct tenant ID safely
    let lenderId = req.user.lender_id;

    if (req.user.role === 'Super Admin') {
      if (!queryLenderId) {
        throw new BadRequestException('Super Admins must provide a ?lender_id= query parameter to view products.');
      }
      lenderId = queryLenderId;
    }

    return this.loanProductService.findAllByLender(lenderId);
  }

  @Patch(':id/toggle')
  @Roles('Super Admin', 'Lender Admin')
  async toggleActiveStatus(
    @NestRequest() req: any, 
    @Param('id') productId: string,
    @Body('lender_id') bodyLenderId?: string
  ) {
    // PATCH requests can safely use the body
    const lenderId = req.user.role === 'Super Admin' ? bodyLenderId : req.user.lender_id;
    
    if (req.user.role === 'Super Admin' && !lenderId) {
      throw new BadRequestException('Super Admins must provide a lender_id in the request body.');
    }

    return this.loanProductService.toggleStatus(productId, lenderId);
  }
}