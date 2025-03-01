import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Res,
  HttpException,
  Body,
  Get,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { HttpService } from '@nestjs/axios';
import { Response } from 'express';
import * as FormData from 'form-data';
import { firstValueFrom } from 'rxjs';
import { ApiConsumes, ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FileType, PrismaClient } from '@prisma/client';
import { PredictService } from './predict.service';

// Define a custom interface for the uploaded file.
export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
@ApiTags('Prediction')
@Controller('predict')
export class PredictController {
  constructor(
    private readonly httpService: HttpService,
    private readonly predictService: PredictService,
    private prisma: PrismaClient,
  ) {}

  @Post('video')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload a video for violence prediction',
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        userId: { type: 'string', example: 'user123' }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Annotated video with detection results',
    headers: {
      'X-Upload-Id': { schema: { type: 'string' }, description: 'Upload record ID' },
      'X-Detection-Status': { schema: { type: 'string' }, description: 'Status of detection' }
    },
    content: { 'video/mp4': { schema: { type: 'string', format: 'binary' } } }
  })
  @ApiResponse({ status: 400, description: 'Invalid file format' })
  @ApiResponse({ status: 500, description: 'Error during prediction' })
  async predictVideo(
    @UploadedFile() file: MulterFile, 
    @Res() res: Response,
    @Body('userId') userId: string
  ) {
    const uploadRecord = await this.predictService.createUploadRecord(userId, file, 'VIDEO');

    try {
      const formData = new FormData();
      const apiUrl = process.env.PREDICT_VIDEO_API as string;

      formData.append('file', file.buffer, file.originalname);
      
      const response = await firstValueFrom(
        this.httpService.post(apiUrl, formData, {
          headers: formData.getHeaders(),
          responseType: 'arraybuffer', // get binary data
        }),
      );

      // 3. Parse detection results from FastAPI response headers
      const detectionData = JSON.parse(response.headers['x-detection-results']);
      
      // 4. Update database with results
      const updatedUpload = await this.predictService.handleDetectionResults(uploadRecord.id, detectionData);

      // Set headers received from FastAPI and pipe the file
      res.set({
        'X-Upload-Id': updatedUpload.id,
        'X-Detection-Status': updatedUpload.detectionStatus,
        'Content-Type': 'application/json',
      });

      res.json({
        videoUrl: `/predict/video/${updatedUpload.id}`,
        overallStatus: detectionData.overallStatus,
        overallConfidence: detectionData.overallConfidence,
        violentFrames: detectionData.violentFrames,
        totalFrames: detectionData.totalFrames,
        results: detectionData.results
      });

    } catch (error) {
      await this.prisma.upload.update({
        where: { id: uploadRecord.id },
        data: { processingStatus: 'FAILED' }
      });

      throw new HttpException('Error during prediction', 500);
    }
  }

  @Get('video/:id')
  @ApiResponse({
    status: 200,
    description: 'Fetch the annotated video',
    content: { 'video/mp4': { schema: { type: 'string', format: 'binary' } } }
  })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async getAnnotatedVideo(@Param('id') id: string, @Res() res: Response) {
    const upload = await this.prisma.upload.findUnique({ where: { id } });

    if (!upload || !upload.annotatedFilePath) {
      throw new HttpException('Video not found', 404);
    }

    res.sendFile(upload.annotatedFilePath, { root: './uploads' });
  }

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async predictImage(@UploadedFile() file: MulterFile, @Res() res: Response) {
    const formData = new FormData();
    const apiUrl = process.env.PREDICT_IMAGE_API as string;
    formData.append('file', file.buffer, file.originalname);

    try {
      const response = await firstValueFrom(
        this.httpService.post(apiUrl, formData, {
          headers: formData.getHeaders(),
          responseType: 'arraybuffer',
        }),
      );

      res.set({
        'Content-Type': response.headers['content-type'],
        'Content-Disposition':
          response.headers['content-disposition'] ||
          `attachment; filename=annotated_${file.originalname}`,
      });
      res.send(response.data);
    } catch (error) {
      throw new HttpException('Error during prediction', 500);
    }
  }
}
