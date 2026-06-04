import { Injectable, ConflictException, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BorrowerService {
    constructor(private prisma: PrismaService) { }

    // --- EXISTING LOGIC ---
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
                user_id: user.id || data.user_id,
            },
        });
    }

    async findByLender(lenderId: string, branchId?: string, userId?: string) {
        return this.prisma.borrower.findMany({
            where: { 
                lender_id: lenderId,
                ...(branchId && { branch_id: branchId }), 
                ...(userId && { user_id: userId })        
            },
            include: {
                documents: { orderBy: { uploaded_at: 'desc' } },
                branch: true,
                loans: { orderBy: { created_at: 'desc' } },
                next_of_kin: true,
                guarantors: true,
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
                    user_id: user.id || data.user_id,
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

    // --- CUSTOMER TRANSFER LOGIC ---
    async getBorrowersForTransfer(user: any) {
        const whereClause: any = {};

        if (user.role !== 'Super Admin') {
            whereClause.lender_id = user.lender_id;
        }

        if (user.role === 'Branch Manager') {
            whereClause.branch_id = user.branch_id;
        }

        return this.prisma.borrower.findMany({
            where: whereClause,
            include: {
                branch: { select: { id: true, name: true, location: true } },
                user: { select: { id: true, first_name: true, last_name: true } },
                lender: { select: { id: true, name: true } } // <--- ADD THIS TO INCLUDE EXACT LENDER NAME
            },
            orderBy: { created_at: 'desc' }
        });
    }

    // UPDATED: Now accepts full payload body to handle target_officer_id
    async transferCustomer(user: any, borrowerId: string, data: { target_branch_id: string, target_officer_id?: string }) {
        if (!data.target_branch_id) {
            throw new BadRequestException('A target branch must be selected.');
        }

        const borrower = await this.prisma.borrower.findUnique({
            where: { id: borrowerId }
        });

        if (!borrower) throw new NotFoundException('Customer profile not found.');

        if (user.role !== 'Super Admin' && borrower.lender_id !== user.lender_id) {
            throw new ForbiddenException('Unauthorized to modify this customer.');
        }

        if (user.role === 'Branch Manager' && borrower.branch_id !== user.branch_id) {
            throw new ForbiddenException('You can only initiate transfers for customers currently in your branch.');
        }

        const targetBranch = await this.prisma.branch.findUnique({ where: { id: data.target_branch_id } });
        if (!targetBranch) throw new NotFoundException('Destination branch not found.');
        if (targetBranch.lender_id !== borrower.lender_id) {
            throw new BadRequestException('Cannot transfer customer to a branch belonging to a different institution.');
        }

        let finalOfficerId = borrower.user_id;

        // Process Officer Transfer if included in the payload
        if (data.target_officer_id !== undefined) {
            if (data.target_officer_id === '') {
                finalOfficerId = null; // Unassign officer
            } else {
                const targetOfficer = await this.prisma.user.findUnique({ where: { id: data.target_officer_id } });
                if (!targetOfficer) throw new NotFoundException('Destination officer not found.');
                if (targetOfficer.lender_id !== borrower.lender_id) {
                    throw new BadRequestException('Officer belongs to a different institution.');
                }
                finalOfficerId = targetOfficer.id;
            }
        }

        if (borrower.branch_id === data.target_branch_id && borrower.user_id === finalOfficerId) {
            throw new BadRequestException('Customer is already assigned to this branch and officer.');
        }

        return this.prisma.borrower.update({
            where: { id: borrowerId },
            data: { 
                branch_id: data.target_branch_id,
                user_id: finalOfficerId
            }
        });
    }

    async addNextOfKin(borrowerId: string, data: any, idDocUrl?: string, idBackDocUrl?: string, passportUrl?: string) {
        return this.prisma.nextOfKin.upsert({
            where: { borrower_id: borrowerId },
            update: { 
                full_name: data.full_name,
                relationship: data.relationship,
                phone_number: data.phone_number,
                id_number: data.id_number,
                ...(idDocUrl && { document_url: idDocUrl }),
                ...(idBackDocUrl && { id_back_document_url: idBackDocUrl }),
                ...(passportUrl && { passport_photo_url: passportUrl })
            },
            create: {
                borrower_id: borrowerId,
                full_name: data.full_name,
                relationship: data.relationship,
                phone_number: data.phone_number,
                id_number: data.id_number,
                document_url: idDocUrl,
                id_back_document_url: idBackDocUrl,
                passport_photo_url: passportUrl
            }
        });
    }

   async addGuarantor(borrowerId: string, data: any, idDocUrl?: string, idBackDocUrl?: string, passportUrl?: string) {
        return this.prisma.guarantor.create({
            data: {
                borrower_id: borrowerId,
                full_name: data.full_name,
                relationship: data.relationship,
                phone_number: data.phone_number,
                id_number: data.id_number,
                ...(idDocUrl && { document_url: idDocUrl }),
                ...(idBackDocUrl && { id_back_document_url: idBackDocUrl }),
                ...(passportUrl && { passport_photo_url: passportUrl })
            }
        });
    }

    async updateGuarantor(borrowerId: string, guarantorId: string, data: any, idDocUrl?: string, idBackDocUrl?: string, passportUrl?: string, user?: any) {
        return this.prisma.guarantor.update({
            where: { id: guarantorId },
            data: {
                full_name: data.full_name,
                relationship: data.relationship,
                phone_number: data.phone_number,
                id_number: data.id_number,
                ...(idDocUrl && { document_url: idDocUrl }),
                ...(idBackDocUrl && { id_back_document_url: idBackDocUrl }),
                ...(passportUrl && { passport_photo_url: passportUrl })
            }
        });
    }

    async deleteNextOfKin(borrowerId: string, user: any) {
        const borrower = await this.prisma.borrower.findUnique({ where: { id: borrowerId } });
        if (!borrower) throw new NotFoundException('Customer profile not found.');
        if (user.role !== 'Super Admin' && borrower.lender_id !== user.lender_id) {
            throw new ForbiddenException('Unauthorized to modify this customer.');
        }

        return this.prisma.nextOfKin.delete({
            where: { borrower_id: borrowerId }
        });
    }

    async deleteGuarantor(borrowerId: string, guarantorId: string, user: any) {
        const borrower = await this.prisma.borrower.findUnique({ where: { id: borrowerId } });
        if (!borrower) throw new NotFoundException('Customer profile not found.');
        if (user.role !== 'Super Admin' && borrower.lender_id !== user.lender_id) {
            throw new ForbiddenException('Unauthorized to modify this customer.');
        }

        return this.prisma.guarantor.delete({
            where: { id: guarantorId }
        });
    }
}