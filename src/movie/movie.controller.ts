import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  ClassSerializerInterceptor,
  ParseIntPipe,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { MovieService } from './movie.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { Public } from 'src/auth/decorator/public.decorator';
import { RBAC } from 'src/auth/decorator/rbac.decorator';
import { Role } from 'src/user/entities/user.entity';
import { GetMoviesDto } from 'src/genre/dto/get-movies.dto';
import { TransactionInterceptor } from 'src/common/interceptor/transaction.interceptor';
import { QueryRunner as QR } from 'typeorm';
import { UserId } from 'src/user/decorator/user-id.decorator';
import { QueryRunner } from 'src/common/decorator/query-runner.decorator';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { Throttle } from 'src/common/decorator/throttle.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('movie')
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
export class MovieController {
  constructor(private readonly movieService: MovieService) {}

  @Get()
  @Public()
  @Throttle({ count: 10, unit: 'minute' })
  getMovies(@Query() dto: GetMoviesDto, @UserId() userId?: number) {
    return this.movieService.findAll(dto, userId);
  }

  @Get('recent')
  @UseInterceptors(CacheInterceptor) // 자동으로 return 값을 캐싱하여 사용
  @CacheKey('MOVIE_RECENT') // 캐시 키 설정하여 url이 달라도 같은 캐시 사용
  @CacheTTL(1000) // 캐시 시간 설정 (초 단위)
  getMoviesRecent() {
    return this.movieService.findRecent();
  }

  @Get(':id')
  @Public()
  getMovie(
    @Param(
      'id',
      new ParseIntPipe({
        exceptionFactory() {
          throw new BadRequestException('숫자를 입력해주세요.');
        },
      }),
    )
    id: number,
  ) {
    return this.movieService.findOne(id);
  }

  @Post()
  @RBAC(Role.admin)
  @UseInterceptors(TransactionInterceptor)
  postMovie(
    @Body() body: CreateMovieDto,
    @QueryRunner() queryRunner: QR,
    @UserId() userId: number,
  ) {
    return this.movieService.create(body, userId, queryRunner);
  }

  @Patch(':id')
  @RBAC(Role.admin)
  patchMovie(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateMovieDto,
  ) {
    return this.movieService.update(id, body);
  }

  @Delete(':id')
  @RBAC(Role.admin)
  deleteMovie(@Param('id') id: number) {
    return this.movieService.remove(id);
  }

  @Post(':id/like')
  createMovieLike(
    @Param('id', ParseIntPipe) movieId: number,
    @UserId() userId: number,
  ) {
    return this.movieService.toggleMovieLike(movieId, userId, true);
  }

  @Post(':id/dislike')
  createMovieDislike(
    @Param('id', ParseIntPipe) movieId: number,
    @UserId() userId: number,
  ) {
    return this.movieService.toggleMovieLike(movieId, userId, false);
  }
}
