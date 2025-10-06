import { Test, TestingModule } from '@nestjs/testing';
import { DirectorService } from './director.service';
import { Repository } from 'typeorm';
import { Director } from './entity/director.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreateDirectorDto } from './dto/create-director.dto';
import { NotFoundException } from '@nestjs/common';

const mockDirectorService = {
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('DirectorService', () => {
  let directorService: DirectorService;
  let directorRepository: Repository<Director>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DirectorService,
        {
          provide: getRepositoryToken(Director),
          useValue: mockDirectorService,
        },
      ],
    }).compile();

    directorService = module.get<DirectorService>(DirectorService);
    directorRepository = module.get<Repository<Director>>(
      getRepositoryToken(Director),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(directorService).toBeDefined();
  });

  describe('create', () => {
    it('should create a new director and return it', async () => {
      const createDirectorDto = { name: 'Steven Spielberg' };
      const result = { id: 1, ...createDirectorDto };

      const saveSpy = jest
        .spyOn(directorRepository, 'save')
        .mockResolvedValue(result as Director);

      await expect(
        directorService.create(createDirectorDto as CreateDirectorDto),
      ).resolves.toEqual(result);
      expect(saveSpy).toHaveBeenCalledWith(createDirectorDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of directors', async () => {
      const result = [
        { id: 1, name: 'Steven Spielberg' },
        { id: 2, name: 'Christopher Nolan' },
      ];

      const findSpy = jest
        .spyOn(directorRepository, 'find')
        .mockResolvedValue(result as Director[]);

      await expect(directorService.findAll()).resolves.toEqual(result);
      expect(findSpy).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a director by id', async () => {
      const result = { id: 1, name: 'Steven Spielberg' };

      const findOneSpy = jest
        .spyOn(directorRepository, 'findOne')
        .mockResolvedValue(result as Director);

      await expect(directorService.findOne(1)).resolves.toEqual(result);
      expect(findOneSpy).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  describe('update', () => {
    it('should update a director and return the updated director', async () => {
      const updateDirectorDto = { name: 'Steven S.' };
      const existingDirector = { id: 1, name: 'Steven Spielberg' };
      const updatedDirector = { id: 1, ...updateDirectorDto };

      jest
        .spyOn(directorRepository, 'findOne')
        .mockResolvedValueOnce(existingDirector as Director) // For initial find
        .mockResolvedValueOnce(updatedDirector as Director); // For returning updated

      const updateSpy = jest
        .spyOn(directorRepository, 'update')
        .mockResolvedValue({} as any);

      await expect(
        directorService.update(1, updateDirectorDto as CreateDirectorDto),
      ).resolves.toEqual(updatedDirector);
      expect(updateSpy).toHaveBeenCalledWith({ id: 1 }, updateDirectorDto);
    });

    it('should throw NotFoundException if director to update not found', async () => {
      const findOneSpy = jest
        .spyOn(directorRepository, 'findOne')
        .mockResolvedValue(null);

      await expect(
        directorService.update(999, {
          name: 'Non Existent',
        } as CreateDirectorDto),
      ).rejects.toThrow(NotFoundException);
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 999 },
      });
    });
  });

  describe('remove', () => {
    it('should delete a director by id and return the id', async () => {
      const existingDirector = { id: 1, name: 'Steven Spielberg' };

      const findOneSpy = jest
        .spyOn(directorRepository, 'findOne')
        .mockResolvedValue(existingDirector as Director);

      const result = await directorService.remove(1);

      expect(findOneSpy).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(1);
    });

    it('should throw NotFoundException if director to remove not found', async () => {
      const findOneSpy = jest
        .spyOn(directorRepository, 'findOne')
        .mockResolvedValue(null);

      await expect(directorService.remove(999)).rejects.toThrow(
        NotFoundException,
      );
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 999 },
      });
    });
  });
});
