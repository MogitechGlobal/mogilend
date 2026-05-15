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

  async findStaffByLender(lenderId: string) {
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

  async inviteStaff(lenderId: string, data: any) {
    if (!lenderId) throw new BadRequestException('Lender ID is required.');

    // 1. Check if email is already in use globally
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists in the system.');
    }

    // 2. Resolve the requested Role ID from the name string
    const role = await this.prisma.role.findUnique({
      where: { name: data.role_name }
    });

    if (!role) {
      throw new BadRequestException(`Role '${data.role_name}' does not exist.`);
    }

    // 3. Generate a secure, temporary password
    const tempPassword = crypto.randomBytes(6).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // 4. Get Lender Name for the email
    const lender = await this.prisma.lender.findUnique({ where: { id: lenderId }});

    // 5. Create the User
    const newUser = await this.prisma.user.create({
      data: {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        password_hash: passwordHash,
        role_id: role.id,
        lender_id: lenderId,
        branch_id: data.branch_id,
        is_active: true
      }
    });

    // 6. Dispatch the welcome email with credentials
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

  // Add this inside your UserService class
  async updatePassword(userId: string, data: any) {
    if (!data.current_password || !data.new_password) {
      throw new BadRequestException('Both current and new passwords are required.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User account not found.');
    }

    // 1. Verify the current (temporary) password
    const isMatch = await bcrypt.compare(data.current_password, user.password_hash);
    if (!isMatch) {
      throw new BadRequestException('The current password provided is incorrect.');
    }

    // 2. Hash the new secure password
    const newPasswordHash = await bcrypt.hash(data.new_password, 10);

    // 3. Update the database
    await this.prisma.user.update({
      where: { id: userId },
      data: { password_hash: newPasswordHash }
    });

    return { message: 'Password updated successfully. Your account is now secure.' };
  }

  async toggleStatus(adminUser: any, targetUserId: string) {
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId }});
    if (!target) throw new NotFoundException('User not found.');

    // Prevent cross-tenant modification
    if (adminUser.role !== 'Super Admin' && target.lender_id !== adminUser.lender_id) {
      throw new ForbiddenException('Unauthorized to modify this user.');
    }

    // Prevent an admin from accidentally suspending themselves
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

    // Tenant isolation
    if (adminUser.role !== 'Super Admin' && target.lender_id !== adminUser.lender_id) {
      throw new ForbiddenException('Unauthorized to modify this user.');
    }

    const updateData: any = { branch_id: data.branch_id };

    // Resolve new role if it was changed
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