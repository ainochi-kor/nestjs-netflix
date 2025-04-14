import { Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import { AppService } from './app.service';

interface Movie {
  id: number;
  title: string;
}

@Controller()
export class AppController {
  #movies: Movie[] = [
    {
      id: 1,
      title: '해리포터',
    },
    {
      id: 2,
      title: '반지의 제왕',
    },
  ];

  constructor(private readonly appService: AppService) {}

  @Get('movie')
  getMovies() {
    return this.#movies;
  }

  @Get('movie/:id')
  getMovie() {
    return {
      id: 1,
      name: '해리포터',
      charactors: ['해리포터', '론위즐리', '헤르미온느 그레인저'],
    };
  }

  @Post('movie')
  postMovie() {
    return {
      id: 3,
      name: '어벤져스',
      charactors: ['아이언맨', '토르', '헐크'],
    };
  }

  @Patch('movie/:id')
  patchMovie() {
    return {
      id: 3,
      name: '어벤져스',
      charactors: ['아이언맨', '블랙위도우'],
    };
  }

  @Delete('movie/:id')
  deleteMovie() {
    return 3;
  }
}
