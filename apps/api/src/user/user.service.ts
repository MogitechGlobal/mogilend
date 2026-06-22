import { Injectable, ConflictException, InternalServerErrorException, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService
  ) {}

  // Explicitly allow null or undefined in the parameter
  async findStaffByLender(lenderId?: string | null) {
    if (!lenderId) return [];
    
    return this.prisma.user.findMany({
      where: { lender_id: lenderId },
      include: { 
        role: true,
        branch: true
      },
      orderBy: { created_at: 'desc' }
    });
  }

  // Explicitly allow null or undefined, then catch it with the BadRequestException
  async inviteStaff(lenderId: string | null | undefined, data: any) {
    if (!lenderId) throw new BadRequestException('Lender ID is required.');

    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists in the system.');
    }

    const role = await this.prisma.role.findUnique({
      where: { name: data.role_name }
    });

    if (!role) {
      throw new BadRequestException(`Role '${data.role_name}' does not exist.`);
    }

    const tempPassword = crypto.randomBytes(6).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const lender = await this.prisma.lender.findUnique({ where: { id: lenderId }});

    const newUser = await this.prisma.user.create({
      data: {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        password_hash: passwordHash,
        role_id: role.id,
        lender_id: lenderId,
        // Ensure empty strings are mapped to true NULL for DB consistency
        branch_id: data.branch_id ? data.branch_id : null,
        is_active: true,
        requires_password_change: true,
        invite_expires_at: expiresAt
      }
    });

    await this.mailService.sendLenderWelcomeEmail(
      data.email, 
      lender?.name || 'MogiLend Partner', 
      tempPassword
    );

    return {
      message: 'Staff member successfully invited and provisioned.',
      user: newUser
    };
  }

  async resendInvite(adminUser: any, targetUserId: string) {
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId }});
    if (!target) throw new NotFoundException('User not found.');

    if (adminUser.role !== 'Super Admin' && target.lender_id !== adminUser.lender_id) {
      throw new ForbiddenException('Unauthorized to modify this user.');
    }

    const tempPassword = crypto.randomBytes(6).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        password_hash: passwordHash,
        requires_password_change: true,
        invite_expires_at: expiresAt
      }
    });

    const lender = await this.prisma.lender.findUnique({ where: { id: target.lender_id as string }});

    await this.mailService.sendLenderWelcomeEmail(
      target.email, 
      lender?.name || 'MogiLend Partner', 
      tempPassword
    );

    return { message: 'New temporary password generated and invite resent successfully.' };
  }

  async updatePassword(userId: string, data: any) {
    if (!data.current_password || !data.new_password) {
      throw new BadRequestException('Both current and new passwords are required.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) throw new NotFoundException('User account not found.');

    const isMatch = await bcrypt.compare(data.current_password, user.password_hash);
    if (!isMatch) throw new BadRequestException('The current password provided is incorrect.');

    if (user.requires_password_change && user.invite_expires_at && new Date() > user.invite_expires_at) {
        throw new ForbiddenException('Your temporary password has expired. Please request a new invite from your administrator.');
    }

    const newPasswordHash = await bcrypt.hash(data.new_password, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { 
          password_hash: newPasswordHash,
          requires_password_change: false, 
          invite_expires_at: null 
      }
    });

    return { message: 'Password updated successfully. Your account is now secure.' };
  }

  async toggleStatus(adminUser: any, targetUserId: string) {
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId }});
    if (!target) throw new NotFoundException('User not found.');

    if (adminUser.role !== 'Super Admin' && target.lender_id !== adminUser.lender_id) {
      throw new ForbiddenException('Unauthorized to modify this user.');
    }

    if (adminUser.id === targetUserId) {
      throw new BadRequestException('You cannot suspend your own active session.');
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { is_active: !target.is_active }
    });
  }

  async updateStaff(adminUser: any, targetUserId: string, data: any) {
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId }});
    if (!target) throw new NotFoundException('User not found.');

    if (adminUser.role !== 'Super Admin' && target.lender_id !== adminUser.lender_id) {
      throw new ForbiddenException('Unauthorized to modify this user.');
    }

    const updateData: any = { 
      branch_id: data.branch_id ? data.branch_id : null 
    };

    if (data.role_name) {
      const role = await this.prisma.role.findUnique({ where: { name: data.role_name }});
      if (!role) throw new BadRequestException(`Role '${data.role_name}' not found.`);
      updateData.role_id = role.id;
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: updateData
    });
  }

  async deleteStaff(adminUser: any, targetUserId: string) {
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId }});
    if (!target) throw new NotFoundException('User not found.');

    if (adminUser.role !== 'Super Admin' && target.lender_id !== adminUser.lender_id) {
      throw new ForbiddenException('Unauthorized to delete this user.');
    }

    if (adminUser.id === targetUserId) {
      throw new BadRequestException('You cannot delete your own active session.');
    }

    return this.prisma.user.delete({ where: { id: targetUserId }});
  }
}