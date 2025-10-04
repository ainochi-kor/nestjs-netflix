import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('common')
@ApiBearerAuth()
export class CommonController {
  @Post('video')
  @UseInterceptors(
    FileInterceptor('video', {
      limits: { fileSize: 1024 * 1024 * 20 }, // 20MB
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'video/mp4') {
          cb(new BadRequestException('지원하지 않는 확장자입니다.'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  createVideo(@UploadedFile() movie: Express.Multer.File) {
    return {
      filePath: movie.filename,
    };
  }
}
