import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';

const mockedUserRepository = {
  findOne: jest.fn(),
};

const mockedConfigService = {
  get: jest.fn(),
};

const mockedJwtService = {
  sign: jest.fn(),
  verify: jest.fn(),
  decode: jest.fn(),
};

const mockedCacheManager = {
  set: jest.fn(),
};

const mockedUserService = {
  create: jest.fn(),
};

describe('AuthService', () => {
  let authService: AuthService;
  let userRepository: Repository<User>;
  let configService: ConfigService;
  let jwtService: JwtService;
  let cacheManager: Cache;
  let userService: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockedUserRepository,
        },
        {
          provide: ConfigService,
          useValue: mockedConfigService,
        },
        {
          provide: JwtService,
          useValue: mockedJwtService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockedCacheManager,
        },
        {
          provide: UserService,
          useValue: mockedUserService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    configService = module.get<ConfigService>(ConfigService);
    jwtService = module.get<JwtService>(JwtService);
    cacheManager = module.get<Cache>('CACHE_MANAGER');
    userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('blockToken', () => {
    it('should block a token', async () => {
      const token = 'token';
      const payload = {
        exp: Math.floor(Date.now() / 1000) + 60,
      };

      const decodeSpyOn = jest
        .spyOn(jwtService, 'decode')
        .mockReturnValue(payload);

      await authService.blockToken(token);

      expect(decodeSpyOn).toHaveBeenCalledWith(token);
      expect(cacheManager.set).toHaveBeenCalledWith(
        `BLOCK_TOKEN_${token}`,
        payload,
        expect.any(Number),
      );
    });
  });

  describe('parseBasicToken', () => {
    it('should parse a valid basic token', () => {
      const rawToken =
        'Basic ' + Buffer.from('username:password').toString('base64');
      const result = authService.parseBasicToken(rawToken);
      const decode = { email: 'username', password: 'password' };

      expect(result).toEqual(decode);
    });

    it('should throw BadRequestException for invalid token format', () => {
      const rawToken = 'InvalidTokenFormat';
      expect(() => authService.parseBasicToken(rawToken)).toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid basic token format', () => {
      const rawToken = 'Bearer InvalidTokenFormat';
      expect(() => authService.parseBasicToken(rawToken)).toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid basic token format', () => {
      const rawToken = 'basic InvalidTokenFormat';
      expect(() => authService.parseBasicToken(rawToken)).toThrow(
        BadRequestException,
      );
    });
  });
});
