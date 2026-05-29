import { 
    Controller, 
    Post, 
    Get, 
    Patch,
    Delete,
    Param,
    Query, 
    BadRequestException, 
    Body, 
    UseGuards, 
    Request as NestRequest, 
    UseInterceptors, 
    UploadedFile,
    UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { BorrowerService } from './borrower.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('v1/borrowers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BorrowerController {
    constructor(
        private readonly borrowerService: BorrowerService,
        private readonly cloudinaryService: CloudinaryService
    ) { }

    @Get()
    async getBorrowers(
        @NestRequest() req: any,
        @Query('lender_id') queryLenderId?: string
    ) {
        let lenderId = req.user.lender_id;

        if (req.user.role === 'Super Admin') {
            if (!queryLenderId) {
                throw new BadRequestException('Super Admins must provide a ?lender_id= query parameter to view borrowers.');
            }
            lenderId = queryLenderId;
        }

        return this.borrowerService.findByLender(lenderId);
    }

    // --- NEW: Customer Transfer Endpoints ---
    @Get('transfer-list')
    @Roles('Super Admin', 'Lender Admin', 'Branch Manager')
    async getBorrowersForTransfer(@NestRequest() req: any) {
        return this.borrowerService.getBorrowersForTransfer(req.user);
    }

    @Patch(':id/transfer')
    @Roles('Super Admin', 'Lender Admin', 'Branch Manager')
    async transferCustomer(
        @NestRequest() req: any, 
        @Param('id') borrowerId: string, 
        @Body('target_branch_id') targetBranchId: string
    ) {
        return this.borrowerService.transferCustomer(req.user, borrowerId, targetBranchId);
    }

    // --- EXISTING LOGIC ---
    @Post()
    @Roles('Super Admin', 'Lender Admin', 'Branch Manager', 'Loan Officer')
    async createBorrower(@NestRequest() req: any, @Body() data: any) {
        return this.borrowerService.create(req.user, data);
    }

    @Patch(':id')
    @Roles('Super Admin', 'Lender Admin', 'Branch Manager') 
    async updateBorrower(@NestRequest() req: any, @Param('id') id: string, @Body() data: any) {
        return this.borrowerService.update(id, req.user, data);
    }

    @Delete(':id')
    @Roles('Super Admin', 'Lender Admin', 'Branch Manager') 
    async deleteBorrower(@NestRequest() req: any, @Param('id') id: string) {
        return this.borrowerService.remove(id, req.user);
    }

    @Post('register-with-kyc')
    @UseInterceptors(FileInterceptor('file'))
    async registerWithKYC(
        @NestRequest() req: any,
        @Body() borrowerData: any,
        @UploadedFile() file: Express.Multer.File
    ) {
        const uploadResult = await this.cloudinaryService.uploadFile(file, 'national-ids');
        return this.borrowerService.createWithKYC(req.user, borrowerData, uploadResult.secure_url);
    }

    @Post(':id/documents')
    @Roles('Super Admin', 'Lender Admin', 'Branch Manager', 'Loan Officer')
    @UseInterceptors(FileInterceptor('file'))
    async uploadDocument(
        @NestRequest() req: any,
        @Param('id') id: string,
        @Body('document_type') documentType: string,
        @UploadedFile() file: Express.Multer.File
    ) {
        if (!file) throw new BadRequestException('No file was uploaded.');
        if (!documentType) throw new BadRequestException('Document classification type is required.');

        const uploadResult = await this.cloudinaryService.uploadFile(file, 'borrower-documents');
        return this.borrowerService.addDocument(id, documentType, uploadResult.secure_url, req.user);
    }

    @Delete(':id/documents/:docId')
    @Roles('Super Admin', 'Lender Admin', 'Branch Manager') 
    async deleteDocument(
        @NestRequest() req: any,
        @Param('id') borrowerId: string,
        @Param('docId') docId: string
    ) {
        return this.borrowerService.removeDocument(borrowerId, docId, req.user);
    }

    @Post(':id/next-of-kin')
    @Roles('Super Admin', 'Lender Admin', 'Branch Manager', 'Loan Officer')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'id_document', maxCount: 1 },
        { name: 'id_document_back', maxCount: 1 },
        { name: 'passport_photo', maxCount: 1 }
    ]))
    async addNextOfKin(
        @Param('id') id: string, 
        @Body() data: any, 
        @UploadedFiles() files: { id_document?: Express.Multer.File[], id_document_back?: Express.Multer.File[], passport_photo?: Express.Multer.File[] }
    ) {
        let idDocUrl = null;
        let idBackDocUrl = null;
        let passportUrl = null;
        
        if (files?.id_document?.[0]) {
            const res = await this.cloudinaryService.uploadFile(files.id_document[0], 'next_of_kin');
            idDocUrl = res.secure_url;
        }
        if (files?.id_document_back?.[0]) {
            const res = await this.cloudinaryService.uploadFile(files.id_document_back[0], 'next_of_kin');
            idBackDocUrl = res.secure_url;
        }
        if (files?.passport_photo?.[0]) {
            const res = await this.cloudinaryService.uploadFile(files.passport_photo[0], 'next_of_kin');
            passportUrl = res.secure_url;
        }
        
        return this.borrowerService.addNextOfKin(id, data, idDocUrl, idBackDocUrl, passportUrl);
    }

    @Post(':id/guarantors')
    @Roles('Super Admin', 'Lender Admin', 'Branch Manager', 'Loan Officer')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'id_document', maxCount: 1 },
        { name: 'id_document_back', maxCount: 1 },
        { name: 'passport_photo', maxCount: 1 }
    ]))
    async addGuarantor(
        @Param('id') id: string, 
        @Body() data: any, 
        @UploadedFiles() files: { id_document?: Express.Multer.File[], id_document_back?: Express.Multer.File[], passport_photo?: Express.Multer.File[] }
    ) {
        let idDocUrl = null;
        let idBackDocUrl = null;
        let passportUrl = null;
        
        if (files?.id_document?.[0]) {
            const res = await this.cloudinaryService.uploadFile(files.id_document[0], 'guarantors');
            idDocUrl = res.secure_url;
        }
        if (files?.id_document_back?.[0]) {
            const res = await this.cloudinaryService.uploadFile(files.id_document_back[0], 'guarantors');
            idBackDocUrl = res.secure_url;
        }
        if (files?.passport_photo?.[0]) {
            const res = await this.cloudinaryService.uploadFile(files.passport_photo[0], 'guarantors');
            passportUrl = res.secure_url;
        }
        
        return this.borrowerService.addGuarantor(id, data, idDocUrl, idBackDocUrl, passportUrl);
    }

    @Delete(':id/next-of-kin')
    @Roles('Super Admin', 'Lender Admin', 'Branch Manager', 'Loan Officer')
    async deleteNextOfKin(
        @Param('id') id: string, 
        @NestRequest() req: any
    ) {
        return this.borrowerService.deleteNextOfKin(id, req.user);
    }

    @Patch(':id/guarantors/:guarantorId')
    @Roles('Super Admin', 'Lender Admin', 'Branch Manager', 'Loan Officer')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'id_document', maxCount: 1 },
        { name: 'id_document_back', maxCount: 1 },
        { name: 'passport_photo', maxCount: 1 }
    ]))
    async updateGuarantor(
        @Param('id') borrowerId: string,
        @Param('guarantorId') guarantorId: string,
        @Body() data: any,
        @UploadedFiles() files: { id_document?: Express.Multer.File[], id_document_back?: Express.Multer.File[], passport_photo?: Express.Multer.File[] },
        @NestRequest() req: any
    ) {
        let idDocUrl = null;
        let idBackDocUrl = null;
        let passportUrl = null;
        
        if (files?.id_document?.[0]) {
            const res = await this.cloudinaryService.uploadFile(files.id_document[0], 'guarantors');
            idDocUrl = res.secure_url;
        }
        if (files?.id_document_back?.[0]) {
            const res = await this.cloudinaryService.uploadFile(files.id_document_back[0], 'guarantors');
            idBackDocUrl = res.secure_url;
        }
        if (files?.passport_photo?.[0]) {
            const res = await this.cloudinaryService.uploadFile(files.passport_photo[0], 'guarantors');
            passportUrl = res.secure_url;
        }
        
        return this.borrowerService.updateGuarantor(borrowerId, guarantorId, data, idDocUrl, idBackDocUrl, passportUrl, req.user);
    }

    @Delete(':id/guarantors/:guarantorId')
    @Roles('Super Admin', 'Lender Admin', 'Branch Manager', 'Loan Officer')
    async deleteGuarantor(
        @Param('id') borrowerId: string, 
        @Param('guarantorId') guarantorId: string, 
        @NestRequest() req: any
    ) {
        return this.borrowerService.deleteGuarantor(borrowerId, guarantorId, req.user);
    }
}