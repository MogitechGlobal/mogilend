import { Injectable, ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLenderDto } from './dto/create-lender.dto';
import { MailService } from '../mail/mail.service'; // Adjust path if necessary
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class LenderService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService // Inject the new Mail Service
  ) {}

  async onboardLender(data: CreateLenderDto) {
    const existingLender = await this.prisma.lender.findUnique({
      where: { email: data.email },
    });

    if (existingLender) {
      throw new ConflictException('A lender with this email already exists.');
    }

    // 1. Generate a secure, random temporary password
    const tempPassword = crypto.randomBytes(6).toString('hex'); // e.g., 'a1b2c3d4e5f6'
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Execute as an atomic transaction to ensure Data Integrity
    const result = await this.prisma.$transaction(async (tx) => {
      
      // 2. Fetch the ID for the 'Lender Admin' role
      const adminRole = await tx.role.findUnique({ where: { name: 'Lender Admin' } });
      if (!adminRole) {
        throw new InternalServerErrorException('Critical Error: Lender Admin role not found in database.');
      }

      // 3. Create the root Lender organization
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

      // 4. Provision the default Headquarters branch
      const branch = await tx.branch.create({
        data: {
          lender_id: lender.id,
          name: 'Headquarters',
          location: data.location || 'Nairobi',
        },
      });

      // 5. Create the initial root User account for this Lender
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

    // 6. After the database transaction is successfully committed, send the email!
    // We send the plain-text `tempPassword` via email, while the DB only stores the hash.
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

  // Add these inside your LenderService class
  async updateLender(id: string, data: any) {
    const lender = await this.prisma.lender.findUnique({ where: { id } });
    if (!lender) throw new NotFoundException('Lender not found.');

    return this.prisma.lender.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        tax_pin: data.tax_pin,
        registration_number: data.registration_number,
      }
    });
  }

  async toggleStatus(id: string) {
    const lender = await this.prisma.lender.findUnique({ where: { id } });
    if (!lender) throw new NotFoundException('Lender not found.');

    const newStatus = lender.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';

    return this.prisma.lender.update({
      where: { id },
      data: { status: newStatus }
    });
  }

  async deleteLender(id: string) {
    const lender = await this.prisma.lender.findUnique({ where: { id } });
    if (!lender) throw new NotFoundException('Lender not found.');

    // Note: Due to cascading relations, deleting a lender will delete all their branches and users.
    // In a production financial system, you might prefer to only 'SUSPEND' rather than hard delete.
    return this.prisma.lender.delete({ where: { id } });
  }
}