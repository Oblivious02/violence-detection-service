import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  HttpException,
  Get,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { HttpService } from '@nestjs/axios';
import * as FormData from 'form-data';
import { firstValueFrom } from 'rxjs';
import { ApiConsumes, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaClient } from '@prisma/client';
import { PredictService } from './predict.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// Define a custom interface for the uploaded file.
export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface VideoDetectionResult {
  overallStatus: 'VIOLENCE_DETECTED' | 'NON_VIOLENCE';
  overallConfidence: number;
  violentFrames?: number;
  totalFrames?: number;
}

interface VideoPredictionResponse {
  videoUrl: string;
  overallStatus: string;
  overallConfidence: number;
  violentFrames: number;
  totalFrames: number;
}

interface ImagePredictionResponse {
  contentType: string;
  contentDisposition: string;
  data: Buffer;
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
  @UseGuards(JwtAuthGuard)
  async predictVideo(
    @UploadedFile() file: MulterFile,
    @Request() req: { user: { sub: string } },
  ): Promise<VideoPredictionResponse> {
    const userId = req.user.sub;

    try {
      return await this.predictService.predictVideo(file, userId);
    } catch {
      throw new HttpException('Error during prediction', 500);
    }
  }

  @Get('video/:id')
  @ApiResponse({
    status: 200,
    description: 'Fetch the annotated video',
    content: { 'video/mp4': { schema: { type: 'string', format: 'binary' } } },
  })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async getAnnotatedVideo(@Param('id') id: string) {
    const upload = await this.prisma.upload.findUnique({ where: { id } });

    if (!upload || !upload.annotatedFilePath) {
      throw new HttpException('Video not found', 404);
    }

    return { filePath: upload.annotatedFilePath };
  }

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async predictImage(
    @UploadedFile() file: MulterFile,
  ): Promise<ImagePredictionResponse> {
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

      return {
        contentType: response.headers['content-type'] as string,
        contentDisposition:
          (response.headers['content-disposition'] as string) ||
          `attachment; filename=annotated_${file.originalname}`,
        data: response.data,
      };
    } catch {
      throw new HttpException('Error during prediction', 500);
    }
  }
}
