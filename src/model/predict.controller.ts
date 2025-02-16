import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Res,
  HttpException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { HttpService } from '@nestjs/axios';
import { Response } from 'express';
import * as FormData from 'form-data';
import { firstValueFrom } from 'rxjs';

// Define a custom interface for the uploaded file.
export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller('predict')
export class PredictController {
  constructor(private readonly httpService: HttpService) {}

  @Post('video')
  @UseInterceptors(FileInterceptor('file'))
  async predictVideo(@UploadedFile() file: MulterFile, @Res() res: Response) {
    const formData = new FormData();
    formData.append('file', file.buffer, file.originalname);

    try {
      const response = await firstValueFrom(
        this.httpService.post('http://localhost:8000/predict_video', formData, {
          headers: formData.getHeaders(),
          responseType: 'arraybuffer', // get binary data
        }),
      );

      // Set headers received from FastAPI and pipe the file
      res.set({
        'Content-Type': response.headers['content-type'],
        'Content-Disposition':
          response.headers['content-disposition'] ||
          `attachment; filename=annotated_${file.originalname}.mp4`,
      });
      res.send(response.data);
    } catch (error) {
      throw new HttpException('Error during prediction', 500);
    }
  }

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async predictImage(@UploadedFile() file: MulterFile, @Res() res: Response) {
    const formData = new FormData();
    formData.append('file', file.buffer, file.originalname);

    try {
      const response = await firstValueFrom(
        this.httpService.post('http://localhost:8000/predict_image', formData, {
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
