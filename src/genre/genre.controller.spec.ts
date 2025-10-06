import { Test, TestingModule } from '@nestjs/testing';
import { GenreController } from './genre.controller';
import { GenreService } from './genre.service';
import { Genre } from './entities/genre.entity';

const mockGenreService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('GenreController', () => {
  let genreController: GenreController;
  let genreService: GenreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenreController],
      providers: [
        {
          provide: GenreService,
          useValue: mockGenreService,
        },
      ],
    }).compile();

    genreController = module.get<GenreController>(GenreController);
    genreService = module.get<GenreService>(GenreService);
  });

  it('should be defined', () => {
    expect(genreController).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of genres', async () => {
      const result = [
        { id: 1, name: 'Action' },
        { id: 2, name: 'Comedy' },
      ];

      const findAllSpy = jest
        .spyOn(genreService, 'findAll')
        .mockResolvedValue(result as Genre[]);

      await expect(genreController.findAll()).resolves.toEqual(result);
      expect(findAllSpy).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single genre', async () => {
      const result = { id: 1, name: 'Action' };

      const findOneSpy = jest
        .spyOn(genreService, 'findOne')
        .mockResolvedValue(result as Genre);

      await expect(genreController.findOne(1)).resolves.toEqual(result);
      expect(findOneSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should create a new genre and return it', async () => {
      const createGenreDto = { name: 'Horror' };
      const result = { id: 3, ...createGenreDto };

      const createSpy = jest
        .spyOn(genreService, 'create')
        .mockResolvedValue(result as Genre);

      await expect(genreController.create(createGenreDto)).resolves.toEqual(
        result,
      );
      expect(createSpy).toHaveBeenCalledWith(createGenreDto);
    });
  });

  describe('update', () => {
    it('should update a genre and return it', async () => {
      const updateGenreDto = { name: 'Sci-Fi' };
      const result = { id: 1, ...updateGenreDto };

      const updateSpy = jest
        .spyOn(genreService, 'update')
        .mockResolvedValue(result as Genre);

      await expect(genreController.update(1, updateGenreDto)).resolves.toEqual(
        result,
      );
      expect(updateSpy).toHaveBeenCalledWith(1, updateGenreDto);
    });
  });

  describe('remove', () => {
    it('should remove a genre and return its id', async () => {
      const result = 1;

      const removeSpy = jest
        .spyOn(genreService, 'remove')
        .mockResolvedValue(result);

      await expect(genreController.remove(1)).resolves.toEqual(result);
      expect(removeSpy).toHaveBeenCalledWith(1);
    });
  });
});
