import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class CursorPaginationDto {
  @IsInt()
  @IsOptional()
  cursor?: string;

  @IsArray()
  @IsString({
    each: true,
  })
  @IsOptional()
  order: string[] = [];

  @IsInt()
  @IsOptional()
  take: number = 5;
}
