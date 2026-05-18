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
import { AuditService } from '../audit/audit.service'; // <-- 1. Import it here

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private auditService: AuditService // <-- 2. Inject it here
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
    // 1. Update the last_login_at timestamp in the database
    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() }
    });

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

  // --- EXISTING REGISTRATION LOGIC ---
  async registerStaff(creator: any, data: any) {
    const targetLenderId = creator.role === 'Super Admin' ? data.lender_id : creator.lender_id;
    
    if (!targetLenderId) {
      throw new ForbiddenException('A lender_id is required to register staff.');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered in the system.');
    }

    const roleRecord = await this.prisma.role.findFirst({
      where: { name: data.role }
    });

    if (!roleRecord) {
      throw new NotFoundException(`The role '${data.role}' does not exist in the database.`);
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

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
        first_name: true,
        last_name: true, 
        email: true,
        created_at: true,
      }
    });

    return newUser;
  }

  // --- IMPERSONATION LOGIC WITH ADVANCED AUDIT LOGGING ---
  async impersonateLender(adminUser: any, targetLenderId: string) {
    if (adminUser.role !== 'Super Admin') {
      throw new ForbiddenException('Only Super Admins can impersonate accounts.');
    }

    const lenderAdmin = await this.prisma.user.findFirst({
      where: {
        lender_id: targetLenderId,
        role: { name: 'Lender Admin' },
        is_active: true
      },
      include: { role: true },
      orderBy: { created_at: 'asc' } 
    });

    if (!lenderAdmin) {
      throw new NotFoundException('No active Lender Admin account found for this institution.');
    }

    // 3. Fire the Audit Log using the injected service and correct schema
    await this.auditService.createLog({
      user_id: adminUser.id || adminUser.sub,
      action: 'IMPERSONATE_TENANT',
      entity_type: 'Lender',
      entity_id: targetLenderId,
      details: { 
        target_email: lenderAdmin.email, 
        message: 'Super Admin initiated a secure impersonation session.'
      }
    });

    return this.generateAuthResponse(lenderAdmin);
  }
}