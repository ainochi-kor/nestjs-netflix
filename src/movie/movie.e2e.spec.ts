import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../app.module';
import { Role, User } from 'src/user/entities/user.entity';
import { Movie } from './entity/movie.entity';
import { Director } from 'src/director/entity/director.entity';
import { Genre } from 'src/genre/entities/genre.entity';
import { DataSource } from 'typeorm';
import { MovieDetail } from './entity/movie-detail.entity';
import { MovieUserLike } from './entity/movie-user-like.entity';
import { AuthService } from 'src/auth/auth.service';

describe('MovieController (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  let users: User[];
  let movies: Movie[];
  let directors: Director[];
  let genres: Genre[];

  let token: string;

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

    const authService = moduleFixture.get<AuthService>(AuthService);
    token = await authService.issueToken(
      {
        id: users[0].id,
        role: Role.admin,
      },
      false,
    );
  });

  afterAll(async () => {
    await new Promise((r) => setTimeout(r, 500));
    await app?.close();
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  describe('[GET /movie]', () => {
    it('should get all movies', async () => {
      const { body, statusCode } = (await request(app.getHttpServer()).get(
        '/movie',
      )) as {
        body: { data: Movie[]; nextCursor: number | null; count: number };
        statusCode: number;
      };

      expect(statusCode).toBe(200);
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('nextCursor');
      expect(body).toHaveProperty('count');

      expect(body.data).toHaveLength(5);
    });
  });

  describe('[GET /movie/recent]', () => {
    it('should get recent movies', async () => {
      const { body, statusCode } = (await request(app.getHttpServer())
        .get('/movie/recent')
        .set('authorization', `Bearer ${token}`)) as {
        body: { data: Movie[]; nextCursor: number | null; count: number };
        statusCode: number;
      };

      expect(statusCode).toBe(200);
      expect(body).toHaveLength(10);
    });
  });

  describe('[GET /movie/:id]', () => {
    it('should get one movie', async () => {
      const movieId = movies[0].id;

      const { body, statusCode } = (await request(app.getHttpServer())
        .get(`/movie/${movieId}`)
        .set('authorization', `Bearer ${token}`)) as {
        body: Movie;
        statusCode: number;
      };

      expect(statusCode).toBe(200);
      expect(body.id).toBe(movieId);
    });

    it('should return 404 if the movie is not found', async () => {
      const movieId = 999999;

      const { body, statusCode } = (await request(app.getHttpServer())
        .get(`/movie/${movieId}`)
        .set('authorization', `Bearer ${token}`)) as {
        body: { statusCode: number; message: string; error: string };
        statusCode: number;
      };

      expect(statusCode).toBe(404);
    });
  });

  describe('[POST /movie]', () => {
    it('should create a movie', async () => {
      const {
        body: { fileName },
      } = (await request(app.getHttpServer())
        .post('/common/video')
        .set('authorization', `Bearer ${token}`)
        .attach('video', Buffer.from('test'), 'movie.mp4')
        .expect(201)) as {
        body: { fileName: string };
      };

      const dto = {
        title: 'New Movie',
        detail: 'This is the detail of New Movie',
        directorId: directors[0].id,
        genreIds: genres.map((g) => g.id),
        movieFileName: fileName,
      };

      const { body, statusCode } = (await request(app.getHttpServer())
        .post(`/movie`)
        .set('authorization', `Bearer ${token}`)
        .send(dto)) as {
        body: Movie;
        statusCode: number;
      };

      expect(statusCode).toBe(201);

      expect(body).toBeDefined();
      expect(body.title).toBe(dto.title);
      expect(body.detail.detail).toBe(dto.detail);
      expect(body.director.id).toBe(dto.directorId);
      expect(body.genres.map((g) => g.id)).toEqual(dto.genreIds);
      expect(body.movieFilePath).toContain(dto.movieFileName);
    });
  });

  describe('[PATCH /modie/:id]', () => {
    it('should update a movie', async () => {
      const dto = {
        title: 'Updated Movie',
        detail: 'This is the detail of Updated Movie',
        directorId: directors[1].id,
        genreIds: [genres[0].id],
      };

      const movieId = movies[0].id;

      const { body, statusCode } = (await request(app.getHttpServer())
        .patch(`/movie/${movieId}`)
        .set('authorization', `Bearer ${token}`)
        .send(dto)) as {
        body: Movie;
        statusCode: number;
      };

      expect(statusCode).toBe(200);

      expect(body).toBeDefined();
      expect(body.id).toBe(movieId);
      expect(body.title).toBe(dto.title);
      expect(body.detail.detail).toBe(dto.detail);
      expect(body.director.id).toBe(dto.directorId);
      expect(body.genres.map((g) => g.id)).toEqual(dto.genreIds);
    });
  });

  describe('[DELETE /movie/:id]', () => {
    it('should delete a movie', async () => {
      const movieId = movies[0].id;

      const { statusCode } = (await request(app.getHttpServer())
        .delete(`/movie/${movieId}`)
        .set('authorization', `Bearer ${token}`)) as {
        body: Movie;
        statusCode: number;
      };

      expect(statusCode).toBe(200);
    });

    it('should return 404 if the movie to delete is not found', async () => {
      const movieId = 999999;

      const { statusCode } = (await request(app.getHttpServer())
        .delete(`/movie/${movieId}`)
        .set('authorization', `Bearer ${token}`)) as {
        body: { statusCode: number; message: string; error: string };
        statusCode: number;
      };

      expect(statusCode).toBe(404);
    });
  });

  describe('[POST /movie/:id/like]', () => {
    it('should like a movie', async () => {
      const movieId = movies[1].id;

      const { body, statusCode } = (await request(app.getHttpServer())
        .post(`/movie/${movieId}/like`)
        .set('authorization', `Bearer ${token}`)) as {
        body: {
          isLike: boolean;
        };
        statusCode: number;
      };

      expect(statusCode).toBe(201);

      expect(body).toBeDefined();
      expect(body.isLike).toBe(true);
    });

    it('should cancle like a movie', async () => {
      const movieId = movies[1].id;

      const { body, statusCode } = (await request(app.getHttpServer())
        .post(`/movie/${movieId}/like`)
        .set('authorization', `Bearer ${token}`)) as {
        body: {
          isLike: boolean;
        };
        statusCode: number;
      };

      expect(statusCode).toBe(201);

      expect(body).toBeDefined();
      expect(body.isLike).toBeNull();
    });

    it('should dislike a movie', async () => {
      const movieId = movies[1].id;

      const { body, statusCode } = (await request(app.getHttpServer())
        .post(`/movie/${movieId}/dislike`)
        .set('authorization', `Bearer ${token}`)) as {
        body: {
          isLike: boolean;
        };
        statusCode: number;
      };

      expect(statusCode).toBe(201);

      expect(body).toBeDefined();
      expect(body.isLike).toBe(false);
    });

    it('should cancle dislike a movie', async () => {
      const movieId = movies[1].id;

      const { body, statusCode } = (await request(app.getHttpServer())
        .post(`/movie/${movieId}/dislike`)
        .set('authorization', `Bearer ${token}`)) as {
        body: {
          isLike: boolean;
        };
        statusCode: number;
      };

      expect(statusCode).toBe(201);

      expect(body).toBeDefined();
      expect(body.isLike).toBeNull();
    });
  });
});
