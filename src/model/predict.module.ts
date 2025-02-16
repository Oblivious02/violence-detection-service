// src/predict/predict.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PredictController } from './predict.controller';

@Module({
  imports: [HttpModule], // We import HttpModule for making HTTP requests.
  controllers: [PredictController],
})
export class PredictModule {}
