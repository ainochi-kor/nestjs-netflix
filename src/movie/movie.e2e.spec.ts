import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../app.module';
import { User } from 'src/user/entities/user.entity';
import { Movie } from './entity/movie.entity';
import { Director } from 'src/director/entity/director.entity';
import { Genre } from 'src/genre/entities/genre.entity';
import { DataSource } from 'typeorm';
import { MovieDetail } from './entity/movie-detail.entity';
import { MovieUserLike } from './entity/movie-user-like.entity';

describe('MovieController (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  let users: User[];
  let movies: Movie[];
  let directors: Director[];
  let genres: Genre[];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true, // class의 타입스크립트 타입 기반으로 타입 변환
        },
      }),
    );
    await app.init();

    dataSource = app.get<DataSource>(DataSource);

    const movieUserLikeRepository = dataSource.getRepository(MovieUserLike);
    const movieRepository = dataSource.getRepository(Movie);
    const movieDetailRepository = dataSource.getRepository(MovieDetail);
    const userRepository = dataSource.getRepository(User);
    const directorRepository = dataSource.getRepository(Director);
    const genreRepository = dataSource.getRepository(Genre);

    await dataSource.dropDatabase(); // ✅ 전체 스키마 제거
    await dataSource.synchronize(); // ✅ 엔티티 기준으로 재생성

    users = [1, 2].map((i) => {
      return userRepository.create({
        id: i,
        email: `${i}@test.com`,
        password: '123123',
      });
    });

    await userRepository.save(users);

    directors = [1, 2].map((i) => {
      return directorRepository.create({
        id: i,
        dob: new Date('1995-09-20'),
        nationality: 'South Korea',
        name: `director${i}`,
      });
    });
    await directorRepository.save(directors);

    genres = [1, 2].map((i) => {
      return genreRepository.create({
        id: i,
        name: `genre${i}`,
      });
    });
    await genreRepository.save(genres);

    movies = Array.from({ length: 20 }, (_, i) => i + 1).map((i) => {
      return movieRepository.create({
        id: i,
        title: `movie${i}`,
        creator: users[0],
        genres,
        likeCount: 0,
        dislikeCount: 0,
        detail: movieDetailRepository.create({
          detail: `This is the detail of movie${i}`,
        }),
        movieFilePath: `/movies/movie${i}.mp4`,
        director: directors[0],
        createdAt: new Date(`2025-10-${i}`),
      });
    });

    await movieRepository.save(movies);
  });

  afterAll(async () => {
    await app?.close();
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  describe('[GET /movie]', () => {
    it('should get all movies', async () => {
      const { body, statusCode } = await request(app.getHttpServer()).get(
        '/movie',
      );

      expect(statusCode).toBe(200);
    });
  });
});
