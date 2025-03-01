// src/predict/predict.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PredictController } from './predict.controller';
import { PredictService } from './predict.service';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [HttpModule], // We import HttpModule for making HTTP requests.
  controllers: [PredictController],
  providers: [PredictService, PrismaClient]
})
export class PredictModule {}
