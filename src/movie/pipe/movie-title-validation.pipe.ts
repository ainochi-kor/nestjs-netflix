import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class MovieTitleValidationPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    // 만약에 글자 길이가 3보다 작으면 에러
    if (value && value.length < 3) {
      throw new BadRequestException('영화 제목은 3글자 이상이어야 합니다.');
    }
    return value;
  }
}
