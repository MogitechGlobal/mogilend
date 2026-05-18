import { 
  Controller, 
  Post, 
  Body, 
  HttpCode, 
  HttpStatus, 
  UseGuards, 
  Request as NestRequest, 
  Param
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto);
    return this.authService.login(user);
  }

  @Post('register-staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Super Admin', 'Lender Admin', 'Branch Manager') // Restrict who can create users
  async registerStaff(@NestRequest() req: any, @Body() staffData: any) {
    // Pass the creator's info to the service to enforce constraints
    return this.authService.registerStaff(req.user, staffData);
  }

  // --- NEW: IMPERSONATION ENDPOINT ---
  @Post('impersonate/:lenderId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Super Admin') // Strictly locked to platform owners
  async impersonateLender(@NestRequest() req: any, @Param('lenderId') lenderId: string) {
    return this.authService.impersonateLender(req.user, lenderId);
  }

  // Future endpoints: @Post('mfa/verify'), @Post('register'), @Post('password-reset')
}