/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/unbound-method */
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
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';

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

      expect(qr.manager.findOne).toHaveBeenCalledWith(Director, {
        where: { id: createMovieDto.directorId },
      });

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

      expect(qr.manager.findOne).toHaveBeenCalledWith(Director, {
        where: {
          id: createMovieDto.directorId,
        },
      });

      expect(qr.manager.find).toHaveBeenCalledWith(Genre, {
        where: {
          id: In(createMovieDto.genreIds),
        },
      });
    });
  });

  describe('update', () => {
    let qr: jest.Mocked<QueryRunner>;
    let updateMovieMock: jest.SpyInstance;
    let updateMovieDetailMock: jest.SpyInstance;
    let updateMovieGenreRelationMock: jest.SpyInstance;

    beforeEach(() => {
      qr = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          findOne: jest.fn(),
          find: jest.fn(),
        },
      } as unknown as jest.Mocked<QueryRunner>;

      updateMovieMock = jest.spyOn(movieService, 'updateMovie');
      updateMovieDetailMock = jest.spyOn(movieService, 'updateMovieDetail');
      updateMovieGenreRelationMock = jest.spyOn(
        movieService,
        'updateMovieGenreRelation',
      );

      jest.spyOn(dataSource, 'createQueryRunner').mockReturnValue(qr);
    });

    it('should update a movie', async () => {
      const updateMovieDto: UpdateMovieDto = {
        title: 'Updated Movie Title',
        directorId: 1,
        genreIds: [1, 2],
        detail: 'Some detail',
      };
      const movie = {
        id: 1,
        detail: { id: 1 },
        genres: [{ id: 1 }, { id: 2 }],
      } as Movie;
      const director = { id: 1, name: 'Director 1' } as Director;
      const genres = [
        { id: 1, name: 'Genre 1' },
        { id: 2, name: 'Genre 2' },
      ] as Genre[];

      (qr.connect as any).mockReturnValue(null);
      (qr.manager.findOne as any).mockResolvedValueOnce(movie);
      (qr.manager.findOne as any).mockResolvedValueOnce(director);
      jest.spyOn(movieRepository, 'findOne').mockResolvedValue(movie);
      (qr.manager.find as any).mockResolvedValueOnce(genres);
      updateMovieMock.mockResolvedValue(undefined);
      updateMovieDetailMock.mockResolvedValue(undefined);
      updateMovieGenreRelationMock.mockResolvedValue(undefined);

      const result = await movieService.update(1, updateMovieDto);

      expect(qr.connect).toHaveBeenCalled();

      expect(qr.startTransaction).toHaveBeenCalled();
      expect(qr.manager.findOne).toHaveBeenCalledWith(Movie, {
        where: { id: 1 },
        relations: ['detail', 'genres'],
      });
      expect(qr.manager.findOne).toHaveBeenCalledWith(Director, {
        where: { id: updateMovieDto.directorId },
      });
      expect(qr.manager.find).toHaveBeenCalledWith(Genre, {
        where: { id: In(updateMovieDto.genreIds as number[]) },
      });
      expect(updateMovieMock).toHaveBeenCalledWith(qr, 1, expect.any(Object));
      expect(updateMovieDetailMock).toHaveBeenCalledWith(
        qr,
        movie,
        updateMovieDto.detail as string,
      );
      expect(updateMovieGenreRelationMock).toHaveBeenCalledWith(
        qr,
        movie,
        genres,
        1,
      );
      expect(qr.commitTransaction).toHaveBeenCalled();
      expect(result).toEqual(movie);
    });

    it('should throw NotFoundException if movie to update not found', async () => {
      const updateMovieDto: UpdateMovieDto = {
        title: 'Updated Movie Title',
      };

      (qr.manager.findOne as any).mockResolvedValueOnce(null);

      await expect(movieService.update(999, updateMovieDto)).rejects.toThrow(
        NotFoundException,
      );

      expect(qr.connect).toHaveBeenCalled();
      expect(qr.startTransaction).toHaveBeenCalled();
      expect(qr.manager.findOne).toHaveBeenCalledWith(Movie, {
        where: { id: 999 },
        relations: ['detail', 'genres'],
      });
      expect(qr.rollbackTransaction).toHaveBeenCalled();
      expect(qr.release).toHaveBeenCalled();
    });

    it('should throw NotFoundException if new director does not exist', async () => {
      const updateMovieDto: UpdateMovieDto = {
        title: 'Updated Movie Title',
        directorId: 1,
      };
      const movie = { id: 1, detail: { id: 1 }, genres: [] };

      (qr.manager.findOne as any).mockResolvedValueOnce(movie);
      (qr.manager.findOne as any).mockResolvedValueOnce(null);

      await expect(movieService.update(1, updateMovieDto)).rejects.toThrow(
        NotFoundException,
      );

      expect(qr.connect).toHaveBeenCalled();
      expect(qr.startTransaction).toHaveBeenCalled();
      expect(qr.manager.findOne).toHaveBeenCalledWith(Movie, {
        where: { id: 1 },
        relations: ['detail', 'genres'],
      });
      expect(qr.manager.findOne).toHaveBeenCalledWith(Director, {
        where: { id: updateMovieDto.directorId },
      });
      expect(qr.rollbackTransaction).toHaveBeenCalled();
      expect(qr.release).toHaveBeenCalled();
    });

    it('should handle errors and rollback transaction', async () => {
      const updateMovieDto: UpdateMovieDto = {
        title: 'Updated Movie Title',
        genreIds: [1, 2],
      };
      const movie = { id: 1, detail: { id: 1 }, genres: [] };

      (qr.manager.findOne as any).mockResolvedValueOnce(movie);
      (qr.manager.find as any).mockResolvedValueOnce([
        {
          id: 1,
          name: 'Genre 1',
        },
      ]);

      await expect(movieService.update(1, updateMovieDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(qr.manager.findOne).toHaveBeenCalledWith(Movie, {
        where: { id: 1 },
        relations: ['detail', 'genres'],
      });
      expect(qr.manager.find).toHaveBeenCalledWith(Genre, {
        where: { id: In(updateMovieDto.genreIds as number[]) },
      });
      expect(qr.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if no fields to update', async () => {
      const updateMovieDto: UpdateMovieDto = {
        title: 'Updated Movie Title',
      };

      (qr.manager.findOne as any).mockResolvedValueOnce(
        new Error('Database Error'),
      );

      await expect(movieService.update(1, updateMovieDto)).rejects.toThrow(
        Error,
      );

      expect(qr.connect).toHaveBeenCalled();
      expect(qr.startTransaction).toHaveBeenCalled();
      expect(qr.manager.findOne).toHaveBeenCalledWith(Movie, {
        where: { id: 1 },
        relations: ['detail', 'genres'],
      });
      expect(qr.rollbackTransaction).toHaveBeenCalled();
      expect(qr.release).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    let findOneMock: jest.SpyInstance;
    let deleteMovieMock: jest.SpyInstance;
    let deleteMovieDetailMock: jest.SpyInstance;

    beforeEach(() => {
      findOneMock = jest.spyOn(movieRepository, 'findOne');
      deleteMovieMock = jest.spyOn(movieService, 'deleteMovie');
      deleteMovieDetailMock = jest.spyOn(movieDetailRepository, 'delete');
    });

    it('should delete a movie by id and return the id', async () => {
      const movie = {
        id: 1,
        detail: { id: 2 },
      };

      findOneMock.mockResolvedValue(movie as Movie);
      deleteMovieMock.mockResolvedValue(undefined);
      deleteMovieDetailMock.mockResolvedValue(undefined);

      const result = await movieService.remove(movie.id);

      expect(findOneMock).toHaveBeenCalledWith({
        where: { id: movie.id },
      });
      expect(deleteMovieMock).toHaveBeenCalledWith(movie.id);
      expect(deleteMovieDetailMock).toHaveBeenCalledWith(movie.detail.id);
      expect(result).toEqual(movie.id);
    });

    it('should throw NotFoundException if movie to remove not found', async () => {
      findOneMock.mockResolvedValue(null);

      await expect(movieService.remove(999)).rejects.toThrow(NotFoundException);
      expect(findOneMock).toHaveBeenCalledWith({
        where: { id: 999 },
      });
    });
  });

  describe('toggleMovieLike', () => {
    let findOneMovieMock: jest.SpyInstance;
    let findOneUserMock: jest.SpyInstance;
    let getLikedRecordMock: jest.SpyInstance;
    let deleteMock: jest.SpyInstance;
    let updateLikeMock: jest.SpyInstance;
    let saveLikeMock: jest.SpyInstance;

    beforeEach(() => {
      findOneMovieMock = jest.spyOn(movieRepository, 'findOne');
      findOneUserMock = jest.spyOn(userRepository, 'findOne');
      getLikedRecordMock = jest.spyOn(movieService, 'getLikedRecord');
      saveLikeMock = jest.spyOn(movieUserLikeRepository, 'save');
      deleteMock = jest.spyOn(movieUserLikeRepository, 'delete');
      updateLikeMock = jest.spyOn(movieUserLikeRepository, 'update');
    });

    it('should toggle like a movie', async () => {
      const movie = { id: 1 };
      const user = { id: 1 };
      const likeRecord = { movie, user, isLike: true };

      findOneMovieMock.mockResolvedValue(movie as Movie);
      findOneUserMock.mockResolvedValue(user as User);
      getLikedRecordMock
        .mockResolvedValueOnce(likeRecord)
        .mockResolvedValueOnce({ isLike: false });

      const result = await movieService.toggleMovieLike(
        movie.id,
        user.id,
        false,
      );

      expect(findOneMovieMock).toHaveBeenCalledWith({
        where: { id: movie.id },
      });
      expect(findOneUserMock).toHaveBeenCalledWith({ where: { id: user.id } });
      expect(getLikedRecordMock).toHaveBeenCalledWith(movie.id, user.id);
      expect(updateLikeMock).toHaveBeenCalledWith(
        {
          movie: { id: movie.id },
          user: { id: user.id },
        },
        { isLike: false },
      );
      expect(result).toEqual({ isLike: false });
    });

    it('should delete like record if toggling like to the same status', async () => {
      const movie = { id: 1 };
      const user = { id: 1 };
      const likeRecord = { movie, user, isLike: true };

      findOneMovieMock.mockResolvedValue(movie as Movie);
      findOneUserMock.mockResolvedValue(user as User);
      getLikedRecordMock
        .mockResolvedValueOnce(likeRecord)
        .mockResolvedValueOnce(null);

      const result = await movieService.toggleMovieLike(
        movie.id,
        user.id,
        true,
      );

      expect(findOneMovieMock).toHaveBeenCalledWith({
        where: { id: movie.id },
      });
      expect(findOneUserMock).toHaveBeenCalledWith({ where: { id: user.id } });
      expect(getLikedRecordMock).toHaveBeenCalledWith(movie.id, user.id);
      expect(deleteMock).toHaveBeenCalledWith({
        movie: { id: movie.id },
        user: { id: user.id },
      });
      expect(result.isLike).toBeNull();
    });

    it('should save a new like record when no existing record', async () => {
      const movie = { id: 1 };
      const user = { id: 1 };

      findOneMovieMock.mockResolvedValue(movie as Movie);
      findOneUserMock.mockResolvedValue(user as User);
      getLikedRecordMock
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ isLike: true });
      saveLikeMock.mockResolvedValue({ isLike: true } as MovieUserLike);

      const result = await movieService.toggleMovieLike(
        movie.id,
        user.id,
        true,
      );

      expect(findOneMovieMock).toHaveBeenCalledWith({
        where: { id: movie.id },
      });
      expect(findOneUserMock).toHaveBeenCalledWith({ where: { id: user.id } });
      expect(getLikedRecordMock).toHaveBeenCalledWith(movie.id, user.id);
      expect(saveLikeMock).toHaveBeenCalledWith({
        movie,
        user,
        isLike: true,
      });
      expect(result).toEqual({ isLike: true });
    });

    it('should throw BadRequestException if movie not found', async () => {
      findOneMovieMock.mockResolvedValue(null);
      findOneUserMock.mockResolvedValue({ id: 1 } as User);

      await expect(movieService.toggleMovieLike(999, 1, true)).rejects.toThrow(
        BadRequestException,
      );
      expect(findOneMovieMock).toHaveBeenCalledWith({
        where: { id: 999 },
      });
      expect(findOneUserMock).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const movie = { id: 1 };

      findOneMovieMock.mockResolvedValue(movie as Movie);
      findOneUserMock.mockResolvedValue(null);

      await expect(movieService.toggleMovieLike(1, 999, true)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(findOneMovieMock).toHaveBeenCalledWith({
        where: { id: movie.id },
      });
      expect(findOneUserMock).toHaveBeenCalledWith({ where: { id: 999 } });
    });
  });
});
