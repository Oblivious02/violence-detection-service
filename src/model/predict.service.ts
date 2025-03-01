import { Injectable } from '@nestjs/common';
import { FileType, PrismaClient } from '@prisma/client';
import { firstValueFrom } from 'rxjs';
import { MulterFile } from './predict.controller';
import { HttpService } from '@nestjs/axios';


@Injectable()
export class PredictService {
  constructor(
    // private readonly httpService: HttpService,
    private prisma: PrismaClient
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
    async createUploadRecord(userId: string, file: MulterFile, fileType: FileType) {
        return this.prisma.upload.create({
        data: {
            userId,
            filePath: '', // Will update after processing
            fileType,
            fileSize: file.size,
            processingStatus: 'PENDING',
            detectionResults: {
                create: []
            }
        },
        include: {
            detectionResults: true
        }
        });
    }

    async handleDetectionResults(uploadId: string, detectionData: any) {
        return this.prisma.upload.update({
        where: { id: uploadId },
        data: {
            processingStatus: 'COMPLETED',
            detectionStatus: detectionData.overallStatus,
            overallConfidence: detectionData.overallConfidence,
            detectionResults: {
            createMany: {
                data: detectionData.results.map(result => ({
                confidence: result.confidence,
                label: result.label,
                severity: result.severity,
                timestamp: result.timestamp
                }))
            }
            }
        },
        include: {
            detectionResults: true
        }
        });
    }
}
