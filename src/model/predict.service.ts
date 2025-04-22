import { Injectable } from '@nestjs/common';
import { FileType, PrismaClient } from '@prisma/client';
import { MulterFile, VideoDetectionResult } from './predict.controller';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { HttpException } from '@nestjs/common';

interface VideoPredictionResponse {
  videoUrl: string;
  overallStatus: string;
  overallConfidence: number;
  violentFrames: number;
  totalFrames: number;
}

@Injectable()
export class PredictService {
  constructor(
    private readonly httpService: HttpService,
    private prisma: PrismaClient,
  ) {}

  //   async analyzeImage(fileBuffer: Buffer): Promise<any> {
  //     const formData = new FormData();
  //     formData.append('file', new Blob([fileBuffer]), 'frame.jpg');

  //     const response = await firstValueFrom(
  //       this.httpService.post('http://localhost:5000/predict', formData, {
  //         headers: formData.getHeaders ? formData.getHeaders() : {}, // adjust if needed
  //       })
  //     );
  //     return response.data;
  //   }
  createUploadRecord(userId: string, file: MulterFile, fileType: FileType) {
    return this.prisma.upload.create({
      data: {
        userId,
        filePath: '',
        fileType,
        fileSize: file.size,
        processingStatus: 'PENDING',
        detectionResults: {
          create: [],
        },
      },
      include: {
        detectionResults: true,
      },
    });
  }

  async handleDetectionResults(
    uploadId: string,
    detectionData: VideoDetectionResult,
  ) {
    return this.prisma.upload.update({
      where: { id: uploadId },
      data: {
        processingStatus: 'COMPLETED',
        detectionStatus: detectionData.overallStatus,
        overallConfidence: detectionData.overallConfidence,
      },
      include: {
        detectionResults: true,
      },
    });
  }

  async predictVideo(
    file: MulterFile,
    userId: string,
  ): Promise<VideoPredictionResponse> {
    const uploadRecord = await this.createUploadRecord(userId, file, 'VIDEO');

    try {
      const formData = new FormData();
      const apiUrl = process.env.PREDICT_VIDEO_API as string;

      formData.append('file', new Blob([file.buffer]), file.originalname);

      const response = await firstValueFrom(
        this.httpService.post(apiUrl, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          responseType: 'arraybuffer',
        }),
      );

      const detectionData: VideoDetectionResult = JSON.parse(
        response.headers['x-detection-results'] as string,
      ) as VideoDetectionResult;

      const updatedUpload = await this.handleDetectionResults(
        uploadRecord.id,
        detectionData,
      );

      return {
        videoUrl: `/predict/video/${updatedUpload.id}`,
        overallStatus: detectionData.overallStatus,
        overallConfidence: detectionData.overallConfidence ?? 0,
        violentFrames: detectionData.violentFrames ?? 0,
        totalFrames: detectionData.totalFrames ?? 0,
      };
    } catch (e) {
      await this.prisma.upload.update({
        where: { id: uploadRecord.id },
        data: { processingStatus: 'FAILED' },
      });

      throw new HttpException('Error during prediction', 500);
    }
  }
}
