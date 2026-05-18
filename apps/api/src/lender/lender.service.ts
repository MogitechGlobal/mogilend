import { Injectable, ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLenderDto } from './dto/create-lender.dto';
import { MailService } from '../mail/mail.service'; 
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class LenderService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService
  ) {}

  async onboardLender(data: CreateLenderDto) {
    const existingLender = await this.prisma.lender.findUnique({
      where: { email: data.email },
    });

    if (existingLender) {
      throw new ConflictException('A lender with this email already exists.');
    }

    const tempPassword = crypto.randomBytes(6).toString('hex'); 
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const adminRole = await tx.role.findUnique({ where: { name: 'Lender Admin' } });
      if (!adminRole) {
        throw new InternalServerErrorException('Critical Error: Lender Admin role not found in database.');
      }

      const lender = await tx.lender.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          tax_pin: data.tax_pin,
          registration_number: data.registration_number,
          status: 'ACTIVE', 
        },
      });

      const branch = await tx.branch.create({
        data: {
          lender_id: lender.id,
          name: 'Headquarters',
          location: data.location || 'Nairobi',
        },
      });

      const rootUser = await tx.user.create({
        data: {
          email: data.email,
          password_hash: passwordHash,
          role_id: adminRole.id,
          lender_id: lender.id,
          branch_id: branch.id,
          first_name: 'System',
          last_name: 'Administrator',
          is_active: true,
        }
      });

      return { lender, default_branch: branch, admin_user: rootUser };
    });

    await this.mailService.sendLenderWelcomeEmail(data.email, data.name, tempPassword);

    return {
      message: 'Institution onboarded successfully. Credentials have been emailed.',
      lender: result.lender
    };
  }

  async getAllLenders() {
    return this.prisma.lender.findMany({
      include: { branches: true },
      orderBy: { created_at: 'desc' }
    });
  }

  // --- FIXED AUDIT LOGGING ---
  async updateLender(adminUser: any, id: string, data: any) {
    const lender = await this.prisma.lender.findUnique({ where: { id } });
    if (!lender) throw new NotFoundException('Lender not found.');

    const updatedLender = await this.prisma.lender.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        tax_pin: data.tax_pin,
        registration_number: data.registration_number,
      }
    });

    // Write directly to your AuditLog schema
    // Use this if your schema has user_id, lender_id, and entity_type
    await this.prisma.auditLog.create({
      data: {
        user_id: adminUser.id || adminUser.sub,
        action: 'UPDATE_LENDER_PROFILE',
        entity_type: 'Lender',
        entity_id: id,
        details: { message: `Updated configuration fields for institution: ${updatedLender.name}` }
      }
    });

    return updatedLender;
  }

  // --- FIXED AUDIT LOGGING ---
  async toggleStatus(adminUser: any, id: string) {
    const lender = await this.prisma.lender.findUnique({ where: { id } });
    if (!lender) throw new NotFoundException('Lender not found.');

    const newStatus = lender.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';

    const updatedLender = await this.prisma.lender.update({
      where: { id },
      data: { status: newStatus }
    });

    // Write directly to your AuditLog schema
    // Use this if your schema has user_id, lender_id, and entity_type
    await this.prisma.auditLog.create({
      data: {
        user_id: adminUser.id || adminUser.sub,
        action: 'UPDATE_LENDER_PROFILE',
        entity_type: 'Lender',
        entity_id: id,
        details: { message: `Updated configuration fields for institution: ${updatedLender.name}` }
      }
    });

    return updatedLender;
  }

  async deleteLender(id: string) {
    const lender = await this.prisma.lender.findUnique({ where: { id } });
    if (!lender) throw new NotFoundException('Lender not found.');

    return this.prisma.lender.delete({ where: { id } });
  }
}