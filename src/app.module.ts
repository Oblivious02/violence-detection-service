import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
// import { LocalStrategy } from './auth/local.strategy';
import { AuthService } from './auth/auth.service';
import { UserService } from './user/user.service';
import { PrismaClient } from '@prisma/client';
import { PredictModule } from './model/predict.module';

@Module({
  imports: [AuthModule, UserModule, PredictModule],
  controllers: [AppController],
  providers: [AppService, AuthService, UserService, PrismaClient],
})
export class AppModule {}
