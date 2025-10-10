import { Cache, CACHE_MANAGER, CacheModule } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movie } from './entity/movie.entity';
import { MovieDetail } from './entity/movie-detail.entity';
import { Director } from 'src/director/entity/director.entity';
import { Genre } from 'src/genre/entities/genre.entity';
import { User } from 'src/user/entities/user.entity';
import { MovieUserLike } from './entity/movie-user-like.entity';
import { MovieService } from './movie.service';
import { CommonService } from 'src/common/common.service';
import { DataSource } from 'typeorm';

describe('MovieService - Integration Test', () => {
  let service: MovieService;
  let cacheManager: Cache;
  let dataSource: DataSource;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        CacheModule.register(),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          dropSchema: true, // 테스트마다 스키마 초기화
          entities: [Movie, MovieDetail, Director, Genre, User, MovieUserLike],
          synchronize: true, // 애플리케이션을 시작할 때 엔티티에 따라 데이터베이스 스키마를 동기화
          logging: false,
        }),
        TypeOrmModule.forFeature([
          Movie,
          MovieDetail,
          Director,
          Genre,
          User,
          MovieUserLike,
        ]),
      ],
      providers: [MovieService, CommonService],
    }).compile();

    service = module.get<MovieService>(MovieService);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
    dataSource = module.get<DataSource>(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
