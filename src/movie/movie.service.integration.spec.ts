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
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { NotFoundException } from '@nestjs/common';

describe('MovieService - Integration Test', () => {
  let service: MovieService;
  let cacheManager: Cache;
  let dataSource: DataSource;

  let users: User[];
  let movies: Movie[];
  let directors: Director[];
  let genres: Genre[];

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

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await cacheManager.clear();

    const movieRepository = dataSource.getRepository(Movie);
    const movieDetailRepository = dataSource.getRepository(MovieDetail);
    const userRepository = dataSource.getRepository(User);
    const directorRepository = dataSource.getRepository(Director);
    const genreRepository = dataSource.getRepository(Genre);
    const movieUserLikeRepository = dataSource.getRepository(MovieUserLike);

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

  describe('findRecent', () => {
    it('should return 10 most recent movies', async () => {
      const result = (await service.findRecent()) as Movie[];

      const sortedMovies = [...movies];
      sortedMovies.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
      sortedMovies.splice(0, 10).map((x) => x.id);

      expect(result).toBe(10);
      expect(result.map((x) => x.id)).toEqual(sortedMovies);
    });

    it('should utilize cache on subsequent calls', async () => {
      const result = (await service.findRecent()) as Movie[];

      const cachedData = (await cacheManager.get('MOVIE_RECENT')) as Movie[];

      expect(cachedData).toEqual(result);
    });
  });

  describe('findAll', () => {
    it('should return movies with correct titles', async () => {
      const dto = {
        title: 'Movie 15',
        order: ['createdAt_DESC'],
        take: 10,
      };

      const result = await service.findAll(dto);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe(dto.title);
      expect(result.data[0]).not.toHaveProperty('likeStatus');
    });

    it('should return likeStatus if userId is provided', async () => {
      const dto = {
        order: ['createdAt_ASC'],
        take: 10,
      };

      const result = await service.findAll(dto, users[0].id);

      expect(result.data).toHaveLength(10);
      expect(result.data[0]).toHaveProperty('likeStatus');
    });
  });

  describe('findOne', () => {
    it('should return the correct movie by ID', async () => {
      const movieId = movies[0].id;

      const result = await service.findOne(movieId);

      expect(result?.id).toBe(movieId);
    });

    it('should throw error if movie not found', async () => {
      const movieId = 9999;

      await expect(service.findOne(movieId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    beforeEach(() => {
      jest.spyOn(service, 'renameMovieFile').mockResolvedValue();
    });
    it('should create a new movie', async () => {
      const createMovieDto: CreateMovieDto = {
        title: 'New Movie',
        detail: 'This is a new movie',
        directorId: directors[0].id,
        genreIds: genres.map((g) => g.id),
        movieFileName: 'new_movie.mp4',
      };

      const result = await service.create(
        createMovieDto,
        users[0].id,
        dataSource.createQueryRunner(),
      );

      expect(result?.title).toBe(createMovieDto.title);
      expect(result?.detail?.detail).toBe(createMovieDto.detail);
      expect(result?.director.id).toBe(createMovieDto.directorId);
      expect(result?.creator.id).toBe(users[0].id);
      expect(result?.genres).toHaveLength(createMovieDto.genreIds.length);
    });
  });

  describe('update', () => {
    it('should update movie correctly', async () => {
      const movieId = movies[0].id;

      const updateMovieDto = {
        title: 'Updated Movie Title',
        detail: 'Updated movie detail',
        directorId: directors[1].id,
        genreIds: [genres[1].id],
      };

      const result = await service.update(movieId, updateMovieDto);

      expect(result?.title).toBe(updateMovieDto.title);
      expect(result?.detail.detail).toBe(updateMovieDto.detail);
      expect(result?.director.id).toBe(updateMovieDto.directorId);
      expect(result?.genres).toHaveLength(1);
      expect(result?.genres[0].id).toBe(updateMovieDto.genreIds[0]);
    });

    it('should throw error if movie not found', async () => {
      const movieId = 9999;

      const updateMovieDto: UpdateMovieDto = {
        title: 'Updated Movie Title',
        detail: 'Updated movie detail',
        directorId: directors[1].id,
        genreIds: [genres[1].id],
      };

      await expect(service.update(movieId, updateMovieDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove movie and its detail', async () => {
      const movieId = movies[0].id;

      const result = await service.remove(movieId);

      const movieRepository = dataSource.getRepository(Movie);
      const movieDetailRepository = dataSource.getRepository(MovieDetail);

      const movie = await movieRepository.findOne({
        where: { id: movieId },
      });
      const movieDetail = await movieDetailRepository.findOne({
        where: { movie: { id: movieId } },
      });

      expect(result).toBe(movieId);
      expect(movie).toBeNull();
      expect(movieDetail).toBeNull();
    });

    it('should throw error if movie not found', async () => {
      const movieId = 9999;

      await expect(service.remove(movieId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleMovieLike', () => {
    it('should create like correctly', async () => {
      const userId = users[0].id;
      const movieId = movies[0].id;

      const result = await service.toggleMovieLike(movieId, userId, true);

      expect(result).toBe({
        isLike: true,
      });
    });

    it('should create dislike correctly', async () => {
      const userId = users[0].id;
      const movieId = movies[0].id;

      const result = await service.toggleMovieLike(movieId, userId, false);

      expect(result).toBe({
        isLike: false,
      });
    });

    it('should toggle like correctly', async () => {
      const userId = users[0].id;
      const movieId = movies[0].id;

      await service.toggleMovieLike(movieId, userId, true);
      const result = await service.toggleMovieLike(movieId, userId, true);

      expect(result.isLike).toBeNull();
    });

    it('should toggle dislike correctly', async () => {
      const userId = users[0].id;
      const movieId = movies[0].id;

      await service.toggleMovieLike(movieId, userId, false);
      const result = await service.toggleMovieLike(movieId, userId, false);

      expect(result.isLike).toBeNull();
    });
  });
});
