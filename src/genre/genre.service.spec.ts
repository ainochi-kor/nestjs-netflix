import { Test, TestingModule } from '@nestjs/testing';
import { GenreService } from './genre.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Genre } from './entities/genre.entity';
import { Repository } from 'typeorm';
import { UpdateGenreDto } from './dto/update-genre.dto';
import { NotFoundException } from '@nestjs/common';

const mockGenreRepository = {
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('GenreService', () => {
  let genreService: GenreService;
  let genreRepository: Repository<Genre>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenreService,
        {
          provide: getRepositoryToken(Genre),
          useValue: mockGenreRepository,
        },
      ],
    }).compile();

    genreService = module.get<GenreService>(GenreService);
    genreRepository = module.get<Repository<Genre>>(getRepositoryToken(Genre));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(genreService).toBeDefined();
  });

  describe('create', () => {
    it('should create a new genre and return it', async () => {
      const createGenreDto = { name: 'Action' };
      const result = { id: 1, ...createGenreDto };

      const saveSpy = jest
        .spyOn(genreRepository, 'save')
        .mockResolvedValue(result as Genre);

      await expect(genreService.create(createGenreDto)).resolves.toEqual(
        result,
      );
      expect(saveSpy).toHaveBeenCalledWith(createGenreDto);
    });

    it('should throw error when creating a duplicate genre', async () => {
      const createGenreDto = { name: 'Action' };

      const findOneSpy = jest
        .spyOn(genreRepository, 'findOne')
        .mockResolvedValue(createGenreDto as Genre);

      await expect(genreService.create(createGenreDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { name: createGenreDto.name },
      });
    });
  });

  describe('findAll', () => {
    it('should return an array of genres', async () => {
      const result = [
        { id: 1, name: 'Action' },
        { id: 2, name: 'Comedy' },
      ];

      const findSpy = jest
        .spyOn(genreRepository, 'find')
        .mockResolvedValue(result as Genre[]);

      await expect(genreService.findAll()).resolves.toEqual(result);
      expect(findSpy).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single genre', async () => {
      const result = { id: 1, name: 'Action' };

      const findOneSpy = jest
        .spyOn(genreRepository, 'findOne')
        .mockResolvedValue(result as Genre);
      await expect(genreService.findOne(1)).resolves.toEqual(result);
      expect(findOneSpy).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  describe('remove', () => {
    it('should delete a genre by id', async () => {
      const id = 1;

      const findOneSpy = jest
        .spyOn(genreRepository, 'findOne')
        .mockResolvedValue({ id } as Genre);
      const deleteSpy = jest.spyOn(genreRepository, 'delete');

      const result = await genreService.remove(id);

      expect(result).toEqual(id);
      expect(findOneSpy).toHaveBeenCalledWith({ where: { id } });
      expect(deleteSpy).toHaveBeenCalledWith(id);
    });

    it('should throw NotFoundException if genre to delete not found', async () => {
      const id = 999;

      const findOneSpy = jest
        .spyOn(genreRepository, 'findOne')
        .mockResolvedValue(null);

      await expect(genreService.remove(id)).rejects.toThrowError(
        '존재하지 않는 ID 값의 장르입니다.',
      );
      expect(findOneSpy).toHaveBeenCalledWith({ where: { id } });
    });
  });

  describe('update', () => {
    it('should update a genre and return it', async () => {
      const id = 1;
      const updateGenreDto = { name: 'Action Updated' };
      const existGenreDto = { id, name: 'Action' };
      const updatedGenre = { id, ...updateGenreDto };

      const findOneSpy = jest
        .spyOn(genreRepository, 'findOne')
        .mockResolvedValueOnce(existGenreDto as Genre)
        .mockResolvedValueOnce(updatedGenre as Genre);

      const updateSpy = jest.spyOn(genreRepository, 'update');

      const result = await genreService.update(id, updateGenreDto);

      expect(result).toEqual(updatedGenre);
      expect(findOneSpy).toHaveBeenCalledWith({ where: { id } });
      expect(updateSpy).toHaveBeenCalledWith(id, updateGenreDto);
    });

    it('should throw NotFoundException if genre to update not found', async () => {
      const id = 999;
      const updateGenreDto: UpdateGenreDto = { name: 'Non Existent' };

      const findOneSpy = jest
        .spyOn(genreRepository, 'findOne')
        .mockResolvedValue(null);

      await expect(genreService.update(id, updateGenreDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(findOneSpy).toHaveBeenCalledWith({ where: { id } });
    });
  });
});
