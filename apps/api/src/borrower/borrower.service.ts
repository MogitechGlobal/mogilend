import { Injectable, ConflictException, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BorrowerService {
    constructor(private prisma: PrismaService) { }

    async create(user: any, data: any) {
        if (!user.lender_id && user.role !== 'Super Admin') {
            throw new ForbiddenException('Only lender staff can register borrowers.');
        }

        const existing = await this.prisma.borrower.findFirst({
            where: {
                OR: [
                    { national_id: data.national_id },
                    { phone_number: data.phone_number }
                ]
            }
        });

        if (existing) {
            throw new ConflictException('Borrower with this ID or Phone already exists.');
        }

        return this.prisma.borrower.create({
            data: {
                first_name: data.first_name,
                last_name: data.last_name,
                national_id: data.national_id,
                phone_number: data.phone_number,
                gender: data.gender,
                address: data.address,
                lender_id: user.lender_id || data.lender_id, 
                branch_id: data.branch_id,
                email: data.email,
            },
        });
    }

    async findByLender(lenderId: string) {
        return this.prisma.borrower.findMany({
            where: { lender_id: lenderId },
            include: { 
                documents: { orderBy: { uploaded_at: 'desc' } },
                branch: true,
                loans: { orderBy: { created_at: 'desc' } }
            },
            orderBy: { created_at: 'desc' }
        });
    }

    async update(id: string, user: any, data: any) {
        const lenderId = user.role === 'Super Admin' ? undefined : user.lender_id;

        const borrower = await this.prisma.borrower.findFirst({
            where: { id, ...(lenderId && { lender_id: lenderId }) }
        });

        if (!borrower) throw new NotFoundException('Borrower not found or unauthorized.');

        if (data.national_id !== borrower.national_id || data.phone_number !== borrower.phone_number) {
            const existing = await this.prisma.borrower.findFirst({
                where: {
                    id: { not: id },
                    OR: [{ national_id: data.national_id }, { phone_number: data.phone_number }]
                }
            });
            if (existing) throw new ConflictException('Another borrower with this ID or Phone already exists.');
        }

        return this.prisma.borrower.update({
            where: { id },
            data: {
                first_name: data.first_name,
                last_name: data.last_name,
                national_id: data.national_id,
                phone_number: data.phone_number,
                email: data.email,
                gender: data.gender,
                address: data.address,
                branch_id: data.branch_id,
                kyc_status: data.kyc_status, 
            },
        });
    }

    async remove(id: string, user: any) {
        const lenderId = user.role === 'Super Admin' ? undefined : user.lender_id;

        const borrower = await this.prisma.borrower.findFirst({
            where: { id, ...(lenderId && { lender_id: lenderId }) },
            include: { loans: true } 
        });

        if (!borrower) throw new NotFoundException('Borrower not found or unauthorized.');

        if (borrower.loans.length > 0) {
            throw new BadRequestException('Accounting Conflict: Cannot delete a customer with a loan history. Please change their status to REJECTED to deactivate the profile.');
        }

        return this.prisma.$transaction(async (tx) => {
            await tx.borrowerDocument.deleteMany({ where: { borrower_id: id } });
            return tx.borrower.delete({ where: { id } });
        });
    }

    async createWithKYC(user: any, data: any, fileUrl: string) {
        const lenderId = user.lender_id || data.lender_id;
        const branchId = user.branch_id || data.branch_id;

        if (!lenderId || !branchId) {
            throw new ForbiddenException('A lender_id and branch_id must be provided.');
        }

        return this.prisma.$transaction(async (tx) => {
            const borrower = await tx.borrower.create({
                data: {
                    first_name: data.first_name,
                    last_name: data.last_name,
                    national_id: data.national_id,
                    phone_number: data.phone_number,
                    lender_id: lenderId,
                    branch_id: branchId,
                },
            });

            await tx.borrowerDocument.create({
                data: {
                    borrower_id: borrower.id,
                    document_type: 'NATIONAL_ID_FRONT',
                    file_url: fileUrl,
                },
            });

            return borrower;
        });
    }

    async addDocument(borrowerId: string, documentType: string, fileUrl: string, user: any) {
        const lenderId = user.role === 'Super Admin' ? undefined : user.lender_id;
        
        const borrower = await this.prisma.borrower.findFirst({
            where: { id: borrowerId, ...(lenderId && { lender_id: lenderId }) }
        });

        if (!borrower) throw new NotFoundException('Borrower not found or unauthorized.');

        return this.prisma.borrowerDocument.create({
            data: {
                borrower_id: borrowerId,
                document_type: documentType,
                file_url: fileUrl,
            }
        });
    }

    // Handles document deletion request from UI
    async removeDocument(borrowerId: string, docId: string, user: any) {
        const lenderId = user.role === 'Super Admin' ? undefined : user.lender_id;

        const borrower = await this.prisma.borrower.findFirst({
            where: { id: borrowerId, ...(lenderId && { lender_id: lenderId }) }
        });
        if (!borrower) throw new NotFoundException('Borrower not found or unauthorized.');

        const document = await this.prisma.borrowerDocument.findFirst({
            where: { id: docId, borrower_id: borrowerId }
        });
        if (!document) throw new NotFoundException('Document not found.');

        return this.prisma.borrowerDocument.delete({
            where: { id: docId }
        });
    }
}