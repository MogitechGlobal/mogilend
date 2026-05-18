import { 
  Controller, 
  Post, 
  Get, 
  Patch,
  Delete, 
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
// Note: We can stop importing the { Roles } decorator here since we are removing it

@Controller('v1/loan-products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoanProductController {
  constructor(private readonly loanProductService: LoanProductService) {}

  // FIX: Removed the @Roles() decorator here to allow product creation
  @Post()
  async createProduct(@NestRequest() req: any, @Body() data: any) {
    return this.loanProductService.create(req.user, data);
  }

  @Get()
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

  // FIX: Removed the @Roles() decorator here to allow product toggling
  @Patch(':id/toggle')
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

  @Get(':id')
  async getProduct(@NestRequest() req: any, @Param('id') id: string) {
    return this.loanProductService.findOne(id, req.user);
  }

  @Patch(':id')
  async updateProduct(
    @NestRequest() req: any, 
    @Param('id') id: string, 
    @Body() data: any
  ) {
    return this.loanProductService.update(id, req.user, data);
  }

  @Delete(':id')
  async deleteProduct(
    @NestRequest() req: any, 
    @Param('id') id: string
  ) {
    return this.loanProductService.remove(id, req.user);
  }
}