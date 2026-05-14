import { 
  Injectable, 
  UnauthorizedException, 
  ConflictException, 
  ForbiddenException,
  NotFoundException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // --- EXISTING LOGIN LOGIC ---
  async validateUser(loginDto: LoginDto): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      include: { role: true }
    });

    if (user && (await bcrypt.compare(loginDto.password, user.password_hash))) {
      const { password_hash, mfa_secret, ...result } = user;
      return result;
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  async login(user: any) {
    if (user.mfa_enabled) {
      // Return temporary token for MFA verification step
      return { mfa_required: true, temp_token: this.generateTempToken(user) };
    }
    
    return this.generateAuthResponse(user);
  }

  private generateTempToken(user: any) {
    return this.jwtService.sign(
      { sub: user.id, email: user.email, mfa_pending: true },
      { expiresIn: '5m' } // 5 minute window to enter MFA code
    );
  }

  private generateAuthResponse(user: any) {
    const payload = { 
      sub: user.id, 
      email: user.email, 
      lender_id: user.lender_id, 
      role: user.role?.name,
      permissions: user.role?.permissions 
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role?.name,
        lender_id: user.lender_id,
        branch_id: user.branch_id
      }
    };
  }

  // --- NEW REGISTRATION LOGIC ---
  async registerStaff(creator: any, data: any) {
    // 1. Strict Tenant Safety: Prevent cross-tenant user creation
    const targetLenderId = creator.role === 'Super Admin' ? data.lender_id : creator.lender_id;
    
    if (!targetLenderId) {
      throw new ForbiddenException('A lender_id is required to register staff.');
    }

    // 2. Check if email already exists globally
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered in the system.');
    }

    // 3. Resolve Role Relation
    // Since the frontend sends a string (e.g. 'Loan Officer'), we must find the corresponding Role ID
    const roleRecord = await this.prisma.role.findFirst({
      where: { name: data.role }
    });

    if (!roleRecord) {
      throw new NotFoundException(`The role '${data.role}' does not exist in the database.`);
    }

    // 4. Hash the password for security
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // 5. Create the User Profile
    const newUser = await this.prisma.user.create({
      data: {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        password_hash: hashedPassword,
        role_id: roleRecord.id,
        lender_id: targetLenderId,
        branch_id: data.branch_id || null,
        is_active: true,
      },
      select: {
        id: true,
        first_name: true, // Now valid after schema update
        last_name: true,  // Now valid after schema update
        email: true,
        created_at: true,
      }
    });

    return newUser;
  }
}