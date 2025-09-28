import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { v4 } from 'uuid';
import { rename } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class MovieFilePipe
  implements PipeTransform<Express.Multer.File, Promise<Express.Multer.File>>
{
  constructor(
    private readonly options: {
      maxSize: number;
      mimetype: string;
    },
  ) {}

  async transform(
    value: Express.Multer.File,
    // metadata: ArgumentMetadata,
  ): Promise<Express.Multer.File> {
    if (!value) {
      throw new BadRequestException('File is required');
    }

    const byteSize = this.options.maxSize * 1024 * 1024; // MB -> byte

    if (value.size > byteSize) {
      throw new BadRequestException(
        `${this.options.maxSize}MB 이하 파일만 업로드 가능합니다.`,
      );
    }
    if (this.options.mimetype !== value.mimetype) {
      throw new BadRequestException(
        `${this.options.mimetype} 파일만 업로드 가능합니다.`,
      );
    }
    const split = value.originalname.split('.');
    const ext = split.pop();
    const filename = `${v4()}_${Date.now()}.${ext}`;
    const newPath = join(value.destination, filename);

    await rename(value.path, newPath);
    return {
      ...value,
      filename,
      path: newPath,
    };
  }
}
