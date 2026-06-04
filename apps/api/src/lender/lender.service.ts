import { Injectable, ConflictException, InternalServerErrorException, NotFoundException, ForbiddenException } from '@nestjs/common';
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

  async onboardLender(adminUser: any, data: CreateLenderDto) {
    const existingLender = await this.prisma.lender.findUnique({
      where: { email: data.email },
    });

    if (existingLender) {
      throw new ConflictException('A lender with this email already exists.');
    }

    const tempPassword = crypto.randomBytes(6).toString('hex'); 
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    
    // Set expiry to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

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
          location: data.location,
        }
      });

      const branch = await tx.branch.create({
        data: {
            lender_id: lender.id,
            name: 'Headquarters',
            location: data.location || 'Main Office'
        }
      });

      const user = await tx.user.create({
        data: {
          first_name: 'Root',
          last_name: 'Administrator',
          email: data.email,
          phone: data.phone,
          password_hash: passwordHash,
          role_id: adminRole.id,
          lender_id: lender.id,
          branch_id: branch.id,
          requires_password_change: true,
          invite_expires_at: expiresAt
        }
      });

      return { lender, user };
    });

    await this.mailService.sendLenderWelcomeEmail(data.email, data.name, tempPassword);

    await this.prisma.auditLog.create({
      data: {
        user_id: adminUser.id || adminUser.sub,
        action: 'CREATE_LENDER',
        entity_type: 'Lender',
        entity_id: result.lender.id,
        details: { message: `Onboarded new institution: ${result.lender.name}` }
      }
    });

    return result.lender;
  }

  async getAllLenders() {
    return this.prisma.lender.findMany({
        include: {
            users: {
                where: { role: { name: 'Lender Admin' } },
                take: 1 // Attach the root admin to check invite status
            },
            _count: {
                select: { branches: true, borrowers: true }
            }
        },
        orderBy: { created_at: 'desc' }
    });
  }

  async updateLender(adminUser: any, id: string, data: any) {
    const lender = await this.prisma.lender.findUnique({ where: { id } });
    if (!lender) throw new NotFoundException('Lender not found.');

    const updatedLender = await this.prisma.lender.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone,
        tax_pin: data.tax_pin,
        registration_number: data.registration_number,
        location: data.location
      }
    });

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

  async toggleStatus(adminUser: any, id: string) {
    const lender = await this.prisma.lender.findUnique({ where: { id } });
    if (!lender) throw new NotFoundException('Lender not found.');

    const newStatus = lender.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';

    const updatedLender = await this.prisma.lender.update({
      where: { id },
      data: { status: newStatus }
    });

    await this.prisma.auditLog.create({
      data: {
        user_id: adminUser.id || adminUser.sub,
        action: newStatus === 'ACTIVE' ? 'ACTIVATE_LENDER' : 'SUSPEND_LENDER',
        entity_type: 'Lender',
        entity_id: id,
        details: { message: `Changed status to ${newStatus} for institution: ${updatedLender.name}` }
      }
    });

    return updatedLender;
  }

  // --- NEW: Resend Invite for Root Administrators ---
  async resendInvite(adminUser: any, lenderId: string) {
    if (adminUser.role !== 'Super Admin') {
        throw new ForbiddenException('Only Super Admins can perform this action.');
    }

    const lender = await this.prisma.lender.findUnique({
        where: { id: lenderId },
        include: { users: { where: { role: { name: 'Lender Admin' } } } }
    });

    if (!lender) throw new NotFoundException('Institution not found.');

    const rootAdmin = lender.users[0];
    if (!rootAdmin) throw new NotFoundException('Root administrator account not found for this institution.');

    const tempPassword = crypto.randomBytes(6).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.prisma.user.update({
        where: { id: rootAdmin.id },
        data: {
            password_hash: passwordHash,
            requires_password_change: true,
            invite_expires_at: expiresAt
        }
    });

    await this.mailService.sendLenderWelcomeEmail(rootAdmin.email, lender.name, tempPassword);

    await this.prisma.auditLog.create({
      data: {
        user_id: adminUser.id || adminUser.sub,
        action: 'RESEND_LENDER_INVITE',
        entity_type: 'Lender',
        entity_id: lender.id,
        details: { message: `Resent welcome email and regenerated password for root admin of ${lender.name}` }
      }
    });

    return { message: 'New invite sent successfully.' };
  }

  async deleteLender(adminUser: any, id: string) {
    const lender = await this.prisma.lender.findUnique({ where: { id } });
    if (!lender) throw new NotFoundException('Lender not found.');
    
    await this.prisma.lender.delete({ where: { id } });

    await this.prisma.auditLog.create({
        data: {
            user_id: adminUser.id || adminUser.sub,
            action: 'DELETE_LENDER',
            entity_type: 'Lender',
            entity_id: id,
            details: { message: `Permanently deleted institution: ${lender.name}` }
        }
    });

    return { message: 'Lender deleted successfully' };
  }
}