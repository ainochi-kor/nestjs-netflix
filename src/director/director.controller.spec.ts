import { Test, TestingModule } from '@nestjs/testing';
import { DirectorController } from './director.controller';
import { DirectorService } from './director.service';
import { Director } from './entity/director.entity';
import { CreateDirectorDto } from './dto/create-director.dto';

const mockDirectorService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('DirectorController', () => {
  let directorController: DirectorController;
  let directorService: DirectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DirectorController],
      providers: [
        {
          provide: DirectorService,
          useValue: mockDirectorService,
        },
      ],
    }).compile();

    directorController = module.get<DirectorController>(DirectorController);
    directorService = module.get<DirectorService>(DirectorService);
  });

  it('should be defined', () => {
    expect(directorController).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of directors', async () => {
      const result = [
        { id: 1, name: 'Steven Spielberg' },
        { id: 2, name: 'Christopher Nolan' },
      ];

      const findAllSpy = jest
        .spyOn(directorService, 'findAll')
        .mockResolvedValue(result as Director[]);

      await expect(directorController.findAll()).resolves.toEqual(result);
      expect(findAllSpy).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single director', async () => {
      const result = { id: 1, name: 'Steven Spielberg' };

      const findOneSpy = jest
        .spyOn(directorService, 'findOne')
        .mockResolvedValue(result as Director);

      await expect(directorController.findOne(1)).resolves.toEqual(result);
      expect(findOneSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should create a new director and return it', async () => {
      const createDirectorDto = { name: 'Steven Spielberg' };
      const result = { id: 1, ...createDirectorDto };

      const createSpy = jest
        .spyOn(directorService, 'create')
        .mockResolvedValue(result as Director);

      await expect(
        directorController.create(createDirectorDto as CreateDirectorDto),
      ).resolves.toEqual(result);
      expect(createSpy).toHaveBeenCalledWith(createDirectorDto);
    });
  });

  describe('update', () => {
    it('should update a director and return it', async () => {
      const updateDirectorDto = { name: 'Steven Spielberg Updated' };
      const result = { id: 1, ...updateDirectorDto };

      const updateSpy = jest
        .spyOn(directorService, 'update')
        .mockResolvedValue(result as Director);

      await expect(
        directorController.update(1, updateDirectorDto as CreateDirectorDto),
      ).resolves.toEqual(result);
      expect(updateSpy).toHaveBeenCalledWith(1, updateDirectorDto);
    });
  });

  describe('remove', () => {
    it('should remove a director and return the id', async () => {
      const result = 1;

      const removeSpy = jest
        .spyOn(directorService, 'remove')
        .mockResolvedValue(result);

      await expect(directorController.remove(1)).resolves.toEqual(result);
      expect(removeSpy).toHaveBeenCalledWith(1);
    });
  });
});
