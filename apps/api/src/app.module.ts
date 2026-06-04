import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { LenderModule } from './lender/lender.module';
import { BorrowerModule } from './borrower/borrower.module';
import { LoanModule } from './loan/loan.module';
import { LoanProductModule } from './loan-product/loan-product.module';
import { TransactionModule } from './transaction/transaction.module';
import { BranchModule } from './branch/branch.module';
import { InterestRatesModule } from './interest-rates/interest-rates.module';
import { UserModule } from './user/user.module';
import { AuditModule } from './audit/audit.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { LeadModule } from './lead/lead.module';

@Module({
  imports: [
    PrismaModule, 
    AuthModule, 
    LenderModule,
    UserModule,
    BorrowerModule,
    LoanProductModule,
    LoanModule,
    TransactionModule,
    BranchModule,
    InterestRatesModule,
    AuditModule,
    LeadModule,

  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_INTERCEPTOR, useClass: AuditInterceptor }],
})
export class AppModule {}
