import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Role, User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

const mockedUserService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('UserController', () => {
  let userController: UserController;
  let userService: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockedUserService,
        },
      ],
    }).compile();
    userController = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(userController).toBeDefined();
  });

  describe('create', () => {
    it('should create a user and return it', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password',
      };

      const user: User = {
        id: 1,
        ...createUserDto,
        password: 'hashedPassword',
        role: Role.user,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdMovies: [],
        likedMovies: [],
        version: 0,
      };

      const createSpy = jest
        .spyOn(userService, 'create')
        .mockResolvedValue(user);

      const result = await userController.create(createUserDto);

      expect(createSpy).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(user);
    });
  });
  describe('findAll', () => {
    it('should return a list of users', async () => {
      const users = [
        {
          id: 1,
          email: 'test@example.com',
        },
        {
          id: 2,
          email: 'test2@example.com',
        },
      ];

      const findAllSpy = jest
        .spyOn(userService, 'findAll')
        .mockResolvedValue(users as User[]);

      const result = await userController.findAll();

      expect(findAllSpy).toHaveBeenCalled();
      expect(result).toEqual(users as User[]);
    });
  });
  describe('findOne', () => {
    it('should return a single user', async () => {
      const user = {
        id: 1,
        email: 'test@example.com',
      };

      const findOneSpy = jest
        .spyOn(userService, 'findOne')
        .mockResolvedValue(user as User);

      const result = await userController.findOne(1);

      expect(findOneSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(user as User);
    });
  });

  describe('update', () => {
    it('should return the updated user', async () => {
      const id = 1;

      const updateUserDto: UpdateUserDto = {
        email: 'updated@example.com',
      };

      const user = {
        id,
        ...updateUserDto,
      };

      const updateSpy = jest
        .spyOn(userService, 'update')
        .mockResolvedValue(user as User);

      const result = await userController.update(id, updateUserDto);

      expect(updateSpy).toHaveBeenCalledWith(id, updateUserDto);
      expect(result).toEqual(user as User);
    });
  });
  describe('remove', () => {
    it('should return a single user', async () => {
      const id = 1;

      const removeSpy = jest.spyOn(userService, 'remove').mockResolvedValue(1);

      const result = await userController.remove(id);

      expect(removeSpy).toHaveBeenCalledWith(id);
      expect(result).toEqual(1);
    });
  });
});
