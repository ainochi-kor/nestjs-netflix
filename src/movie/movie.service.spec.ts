/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { MovieService } from './movie.service';
import { TestBed } from '@automock/jest';
import { DataSource, In, QueryRunner, Repository } from 'typeorm';
import { Movie } from './entity/movie.entity';
import { MovieDetail } from './entity/movie-detail.entity';
import { Director } from 'src/director/entity/director.entity';
import { Genre } from 'src/genre/entities/genre.entity';
import { User } from 'src/user/entities/user.entity';
import { MovieUserLike } from './entity/movie-user-like.entity';
import { CommonService } from 'src/common/common.service';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GetMoviesDto } from 'src/genre/dto/get-movies.dto';
import { title } from 'process';
import { NotFoundException } from '@nestjs/common';
import { find } from 'rxjs';
import { CreateMovieDto } from './dto/create-movie.dto';

describe('MovieService', () => {
  let movieService: MovieService;
  let movieRepository: jest.Mocked<Repository<Movie>>;
  let movieDetailRepository: jest.Mocked<Repository<MovieDetail>>;
  let directorRepository: jest.Mocked<Repository<Director>>;
  let genreRepository: jest.Mocked<Repository<Genre>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let movieUserLikeRepository: jest.Mocked<Repository<MovieUserLike>>;
  let dataSource: jest.Mocked<DataSource>;
  let commonService: jest.Mocked<CommonService>;
  let cacheManager: Cache;

  beforeEach(() => {
    const { unit, unitRef } = TestBed.create(MovieService).compile();

    movieService = unit;
    movieRepository = unitRef.get(getRepositoryToken(Movie) as string);
    movieDetailRepository = unitRef.get(
      getRepositoryToken(MovieDetail) as string,
    );
    directorRepository = unitRef.get(getRepositoryToken(Director) as string);
    genreRepository = unitRef.get(getRepositoryToken(Genre) as string);
    userRepository = unitRef.get(getRepositoryToken(User) as string);
    movieUserLikeRepository = unitRef.get(
      getRepositoryToken(MovieUserLike) as string,
    );
    dataSource = unitRef.get(DataSource);
    commonService = unitRef.get(CommonService);
    cacheManager = unitRef.get(CACHE_MANAGER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(movieService).toBeDefined();
  });

  describe('findRecent', () => {
    it('should return an array of recent movies', async () => {
      const cachedMovies = [
        {
          id: 1,
          title: 'Inception',
        },
      ];

      const getCacheSpy = jest
        .spyOn(cacheManager, 'get')
        .mockResolvedValue(cachedMovies);

      const result = await movieService.findRecent();

      expect(result).toEqual(cachedMovies);
      expect(getCacheSpy).toHaveBeenCalledWith('MOVIE_RECENT');
    });

    it('should fetch recent movies from the database if not cached', async () => {
      const recentMovies = [{ id: 1, title: 'Inception' }];

      const getCacheSpy = jest
        .spyOn(cacheManager, 'get')
        .mockResolvedValue(null);
      jest
        .spyOn(movieRepository, 'find')
        .mockResolvedValue(recentMovies as Movie[]);
      const setSpy = jest
        .spyOn(cacheManager, 'set')
        .mockResolvedValue(undefined);

      const result = await movieService.findRecent();

      expect(getCacheSpy).toHaveBeenCalledWith('MOVIE_RECENT');
      expect(setSpy).toHaveBeenCalledWith('MOVIE_RECENT', recentMovies);
      expect(result).toEqual(recentMovies);
    });
  });

  describe('findAll', () => {
    let getMoviesMock: jest.SpyInstance;
    let getLikeedMovieMock: jest.SpyInstance;

    beforeEach(() => {
      getMoviesMock = jest.spyOn(movieService, 'getMovies');
      getLikeedMovieMock = jest.spyOn(movieService, 'getLikedMovies');
    });

    it('should return an array of all movies without user likes', async () => {
      const movies = [
        { id: 1, title: 'Inception' },
        { id: 2, title: 'The Dark Knight' },
      ];

      const dto = { title: 'Inception' } as GetMoviesDto;
      const qb = {
        where: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([movies, movies.length]),
      };

      getMoviesMock.mockReturnValue(qb);

      const applyCursorPaginationParamsToQbSpy = jest
        .spyOn(commonService, 'applyCursorPaginationParamsToQb')
        .mockResolvedValue({
          nextCursor: null,
        } as any);

      const result = await movieService.findAll(dto);

      expect(getMoviesMock).toHaveBeenCalled();
      expect(qb.where).toHaveBeenCalledWith('movie.title LIKE :title', {
        title: `%${dto.title}%`,
      });
      expect(applyCursorPaginationParamsToQbSpy).toHaveBeenCalledWith(qb, dto);
      expect(qb.getManyAndCount).toHaveBeenCalled();
      expect(result).toEqual({
        data: movies,
        nextCursor: null,
        count: movies.length,
      });
    });

    it('should return an array of all movies with user likes', async () => {
      const movies = [
        { id: 1, title: 'Movie 1' },
        { id: 2, title: 'Movie 2' },
      ] as Movie[];

      const likedMovies = [
        { movie: { id: 1 }, isLike: true },
        { movie: { id: 2 }, isLike: false },
      ];

      const dto = { title: 'Movie' } as GetMoviesDto;
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([movies, movies.length]),
      };

      getMoviesMock.mockReturnValue(qb);
      const applyCursorPaginationParamsToQbSpy = jest
        .spyOn(commonService, 'applyCursorPaginationParamsToQb')
        .mockResolvedValue({
          nextCursor: null,
        } as any);
      getLikeedMovieMock.mockResolvedValue(likedMovies);

      const userId = 1;
      const result = await movieService.findAll(dto, userId);

      expect(getMoviesMock).toHaveBeenCalled();
      expect(qb.where).toHaveBeenCalledWith('movie.title LIKE :title', {
        title: `%${dto.title}%`,
      });
      expect(applyCursorPaginationParamsToQbSpy).toHaveBeenCalledWith(qb, dto);
      expect(getLikeedMovieMock).toHaveBeenCalledWith([1, 2], userId);
      expect(qb.getManyAndCount).toHaveBeenCalled();
      expect(result).toEqual({
        data: [
          { id: 1, title: 'Movie 1', likeStatus: true },
          { id: 2, title: 'Movie 2', likeStatus: false },
        ],
        nextCursor: null,
        count: movies.length,
      });
    });
    it('should return movies without title filter', async () => {
      const movies = [
        {
          id: 1,
          title: 'Movie 1',
        },
      ];
      const dto = {} as GetMoviesDto;
      const qb = {
        getManyAndCount: jest
          .fn()
          .mockResolvedValue([movies as Movie[], movies.length]),
      };

      getMoviesMock.mockReturnValue(qb);

      const applyCursorPaginationParamsToQbSpy = jest
        .spyOn(commonService, 'applyCursorPaginationParamsToQb')
        .mockResolvedValue({
          nextCursor: null,
        } as any);

      const result = await movieService.findAll(dto);

      expect(getMoviesMock).toHaveBeenCalled();
      expect(applyCursorPaginationParamsToQbSpy).toHaveBeenCalledWith(qb, dto);
      expect(qb.getManyAndCount).toHaveBeenCalled();
      expect(result).toEqual({
        data: movies,
        nextCursor: null,
        count: movies.length,
      });
    });
  });

  describe('findOne', () => {
    let findMovieDetailByIdMock: jest.SpyInstance;

    beforeEach(() => {
      findMovieDetailByIdMock = jest.spyOn(movieService, 'findMovieDetailById');
    });

    it('should return a single movie by id', async () => {
      const movie = { id: 1, title: 'Movie 1' } as Movie;

      findMovieDetailByIdMock.mockResolvedValue(movie);

      const result = await movieService.findOne(1);

      expect(findMovieDetailByIdMock).toHaveBeenCalledWith(1);
      expect(result).toEqual(movie);
    });

    it('should throw NotFoundException if movie not found', async () => {
      findMovieDetailByIdMock.mockResolvedValue(null);

      await expect(movieService.findOne(999)).rejects.toThrow(
        NotFoundException,
      );
      expect(findMovieDetailByIdMock).toHaveBeenCalledWith(999);
    });
  });

  describe('create', () => {
    let qr: jest.Mocked<QueryRunner>;
    let createMovieDetailMock: jest.SpyInstance;
    let createMovieMock: jest.SpyInstance;
    let createMovieGenreRelationMock: jest.SpyInstance;
    let renameMovieFileMock: jest.SpyInstance;

    beforeEach(() => {
      qr = {
        manager: {
          findOne: jest.fn(),
          find: jest.fn(),
        },
      } as unknown as jest.Mocked<QueryRunner>;
      createMovieDetailMock = jest.spyOn(movieService, 'createMovieDetail');
      createMovieMock = jest.spyOn(movieService, 'createMovie');
      createMovieGenreRelationMock = jest.spyOn(
        movieService,
        'createMovieGenreRelation',
      );
      renameMovieFileMock = jest.spyOn(movieService, 'renameMovieFile');
    });

    it('should create a new movie', async () => {
      const createMovieDto: CreateMovieDto = {
        title: 'Movie Title',
        directorId: 1,
        genreIds: [1, 2],
        detail: 'Some detail',
        movieFileName: 'movie.mp4',
      };
      const userId = 1;
      const director = { id: 1, name: 'Director 1' } as Director;
      const genres = [
        { id: 1, name: 'Genre 1' },
        { id: 2, name: 'Genre 2' },
      ] as Genre[];
      const movieDetailInsertResult = { identifiers: [{ id: 1 }] };
      const movieInsertResult = { identifiers: [{ id: 1 }] };

      (qr.manager.findOne as any).mockResolvedValueOnce(director);
      (qr.manager.findOne as any).mockResolvedValueOnce({
        ...createMovieDto,
        id: 1,
      });
      (qr.manager.find as any).mockResolvedValueOnce(genres);

      createMovieDetailMock.mockResolvedValue(movieDetailInsertResult);
      createMovieMock.mockResolvedValue(movieInsertResult);
      createMovieGenreRelationMock.mockResolvedValue(undefined);
      renameMovieFileMock.mockResolvedValue(undefined);

      const result = await movieService.create(createMovieDto, userId, qr);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(qr.manager.findOne).toHaveBeenCalledWith(Director, {
        where: { id: createMovieDto.directorId },
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(qr.manager.find).toHaveBeenCalledWith(Genre, {
        where: { id: In(createMovieDto.genreIds) },
      });
      expect(createMovieDetailMock).toHaveBeenCalledWith(qr, createMovieDto);
      expect(createMovieMock).toHaveBeenCalledWith(
        qr,
        createMovieDto,
        director,
        movieDetailInsertResult.identifiers[0].id,
        userId,
        expect.any(String),
      );
      expect(createMovieGenreRelationMock).toHaveBeenCalledWith(
        qr,
        movieInsertResult.identifiers[0].id,
        genres,
      );
      expect(renameMovieFileMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        createMovieDto,
      );
      expect(result).toEqual({
        ...createMovieDto,
        id: 1,
      });
    });

    it('shold throw not found error', async () => {
      const createMovieDto: CreateMovieDto = {
        title: 'Movie Title',
        directorId: 1,
        genreIds: [1, 2],
        detail: 'Some detail',
        movieFileName: 'movie.mp4',
      };
      const userId = 1;

      (qr.manager.findOne as any).mockResolvedValueOnce(null);

      await expect(
        movieService.create(createMovieDto, userId, qr),
      ).rejects.toThrow(NotFoundException);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(qr.manager.findOne).toHaveBeenCalledWith(Director, {
        where: {
          id: createMovieDto.directorId,
        },
      });
    });

    it('should not found exception if some genres are missing', async () => {
      const createMovieDto: CreateMovieDto = {
        title: 'Movie Title',
        directorId: 1,
        genreIds: [1, 2],
        detail: 'Some detail',
        movieFileName: 'movie.mp4',
      };
      const userId = 1;
      const director = {
        id: 1,
        name: 'Director',
      };

      (qr.manager.findOne as any).mockResolvedValueOnce(director);
      (qr.manager.find as any).mockResolvedValueOnce([
        {
          id: 1,
          name: 'Genre 1',
        },
      ]);

      await expect(
        movieService.create(createMovieDto, userId, qr),
      ).rejects.toThrow(NotFoundException);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(qr.manager.findOne).toHaveBeenCalledWith(Director, {
        where: {
          id: createMovieDto.directorId,
        },
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(qr.manager.find).toHaveBeenCalledWith(Genre, {
        where: {
          id: In(createMovieDto.genreIds),
        },
      });
    });
  });
});
