import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MailService } from '../mail/mail.service'; 

@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [UserService, MailService], 
  exports: [UserService] // Optional: Export if other modules ever need to search for users
})
export class UserModule {}