import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';

export class CreateMovieDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: '영화 제목',
    example: '겨울왕국',
  })
  title: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: '영화 상세 설명',
    example: '겨울왕국은 2013년에 개봉한 디즈니 애니메이션 영화입니다.',
  })
  detail: string;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: '감독 객체 ID',
    example: 1,
  })
  directorId: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsNumber(
    {},
    {
      each: true, // 각 요소가 숫자인지 확인
    },
  )
  @Type(() => Number)
  @ApiProperty({
    description: '장르 객체 ID 배열',
    example: [1, 2],
  })
  genreIds: number[];

  @IsString()
  @ApiProperty({
    description: '영화 파일 이름',
    example: 'movie-1679658493843.mp4',
  })
  movieFileName: string;
}
