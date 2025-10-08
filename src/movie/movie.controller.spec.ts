/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
import { QueryRunner } from 'typeorm';
import { CreateMovieDto } from './dto/create-movie.dto';
import { MovieController } from './movie.controller';
import { MovieService } from './movie.service';
import { TestBed } from '@automock/jest';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { BadRequestException } from '@nestjs/common';

describe('MovieController', () => {
  let movieController: MovieController;
  let movieService: jest.Mocked<MovieService>;

  beforeEach(() => {
    const { unit, unitRef } = TestBed.create(MovieController).compile();
    movieController = unit;
    movieService = unitRef.get(MovieService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(true).toBe(true);
  });

  describe('getMovies', () => {
    it('should call movieService.findAll with the correct parameters', async () => {
      const dto = { page: 1, limit: 10 };
      const userId = 1;
      const movies = [{ id: 1 }, { id: 2 }];

      jest.spyOn(movieService, 'findAll').mockResolvedValue(movies as any);

      const result = await movieController.getMovies(dto as any, userId);

      expect(movieService.findAll).toHaveBeenCalledWith(dto, userId);
      expect(result).toBe(movies);
    });
  });

  describe('recent', () => {
    it('should call movieService.findRecent', async () => {
      await movieController.getMoviesRecent();
      expect(movieService.findRecent).toHaveBeenCalled();
    });
  });

  describe('getMovie', () => {
    it('should call movieService.findOne with the correct parameters', async () => {
      const id = 1;
      await movieController.getMovie(id);

      expect(movieService.findOne).toHaveBeenCalledWith(id);
    });

    it('should throw BadRequestException if id is not a number', async () => {
      jest
        .spyOn(movieService, 'findOne')
        .mockRejectedValue(new BadRequestException());

      await expect(movieController.getMovie(NaN)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('postMovie', () => {
    it('should call movieService.create with the correct parameters', async () => {
      const body = { title: 'Test Movie' };
      const userId = 1;
      const queryRunner = {};

      await movieController.postMovie(
        body as CreateMovieDto,
        queryRunner as QueryRunner,
        userId,
      );
    });
  });

  describe('patchMovie', () => {
    it('should call movieService.update with the correct parameters', async () => {
      const id = 1;
      const body: UpdateMovieDto = { title: 'Updated Movie' };

      await movieController.patchMovie(id, body);

      expect(movieService.update).toHaveBeenCalledWith(id, body);
    });
  });

  describe('deleteMovie', () => {
    it('should call movieService.remove with the correct parameters', async () => {
      const id = 1;

      await movieController.deleteMovie(id);

      expect(movieService.remove).toHaveBeenCalledWith(id);
    });
  });

  describe('createMovieLike', () => {
    it('should call movieService.createMovieLike with the correct parameters', async () => {
      const movieId = 1;
      const userId = 2;

      await movieController.createMovieLike(movieId, userId);
      expect(movieService.toggleMovieLike).toHaveBeenCalledWith(
        movieId,
        userId,
        true,
      );
    });

    it('should call movieService.createMovieDislike with the correct parameters', async () => {
      const movieId = 1;
      const userId = 2;

      await movieController.createMovieDislike(movieId, userId);
      expect(movieService.toggleMovieLike).toHaveBeenCalledWith(
        movieId,
        userId,
        false,
      );
    });
  });
});
