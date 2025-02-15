import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaClient } from '@prisma/client';

@Module({
  providers: [UserService, PrismaClient],
})
export class UserModule {}
