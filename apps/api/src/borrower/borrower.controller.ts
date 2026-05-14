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
    UploadedFile 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

    // THIS IS THE MISSING ENDPOINT THAT CAUSES THE 404 ERROR
    @Delete(':id/documents/:docId')
    @Roles('Super Admin', 'Lender Admin', 'Branch Manager') 
    async deleteDocument(
        @NestRequest() req: any,
        @Param('id') borrowerId: string,
        @Param('docId') docId: string
    ) {
        return this.borrowerService.removeDocument(borrowerId, docId, req.user);
    }
}