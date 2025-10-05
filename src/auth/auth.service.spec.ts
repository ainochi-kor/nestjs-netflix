import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { Repository } from 'typeorm';
import { Role, User } from 'src/user/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const mockedUserRepository = {
  findOne: jest.fn(),
};

const mockedConfigService = {
  get: jest.fn(),
};

const mockedJwtService = {
  sign: jest.fn(),
  verify: jest.fn(),
  verifyAsync: jest.fn(), // Add this line to mock verifyAsync
  decode: jest.fn(),
  signAsync: jest.fn(),
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

  describe('parseBasicToken', () => {
    it('should parse a valid Bearer Token', async () => {
      const rawToken = 'Bearer token';
      const payload = { type: 'access' };
      const verifyAsync = jest
        .spyOn(jwtService, 'verifyAsync')
        .mockResolvedValue(payload);

      jest.spyOn(mockedConfigService, 'get').mockReturnValue('secret');

      const result = await authService.parseBearerToken(rawToken, false);

      expect(verifyAsync).toHaveBeenCalledWith('token', {
        secret: 'secret',
      });
      expect(result).toEqual(payload);
    });

    it('should throw a BadRequestException for invalid Bearer token format', async () => {
      const rawToken = 'a';
      await expect(
        authService.parseBearerToken(rawToken, false),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw a BadRequestException for token not starting with Bearer', async () => {
      const rawToken = 'Basic InvalidTokenFormat';
      await expect(
        authService.parseBearerToken(rawToken, false),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw a BadRequestException if payload. type is not refresh but isRefreshToken parameter is true', async () => {
      const rawToken = 'Bearer a';

      jest
        .spyOn(jwtService, 'verifyAsync')
        .mockResolvedValue({ type: 'refresh' });

      await expect(
        authService.parseBearerToken(rawToken, false),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw a BadRequestException if payload. type is not access but isAccessToken parameter is true', async () => {
      const rawToken = 'Bearer a';

      jest
        .spyOn(jwtService, 'verifyAsync')
        .mockResolvedValue({ type: 'access' });

      await expect(
        authService.parseBearerToken(rawToken, true),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const rawToken = 'basic abcdefgh'; // 'abcdefgh'를 base64로 인코딩한 값
      const user = {
        email: 'email',
        password: 'password',
      };

      const parseBasicTokenSpy = jest
        .spyOn(authService, 'parseBasicToken')
        .mockReturnValue(user);
      const createSpy = jest
        .spyOn(userService, 'create')
        .mockResolvedValue({ id: 1, ...user } as User);

      const result = await authService.register(rawToken);

      expect(parseBasicTokenSpy).toHaveBeenCalledWith(rawToken);
      expect(createSpy).toHaveBeenCalledWith(user);
      expect(result).toEqual({ id: 1, ...user });
    });
  });

  describe('authenticate', () => {
    it('should authenticate a user with correct credentials', async () => {
      const email = 'email@example.com';
      const password = 'password';
      const user = { email, password: 'hashedPassword' };

      const findOneSpy = jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(user as User);

      const compareSpy = jest
        .spyOn(bcrypt, 'compare')
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .mockImplementation((password, hashedPassword) => true);

      const result = await authService.authenticate(email, password);

      expect(findOneSpy).toHaveBeenCalledWith({ where: { email } });
      expect(compareSpy).toHaveBeenCalledWith(password, user.password);
      expect(result).toEqual(user);
    });

    it('should throw BadRequestException if user not found', async () => {
      const findOneSpy = jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(null);

      await expect(
        authService.authenticate('email', 'password'),
      ).rejects.toThrow(BadRequestException);
      expect(findOneSpy).toHaveBeenCalledWith({ where: { email: 'email' } });
    });

    it('should throw BadRequestException if password is incorrect', async () => {
      const user = { email: 'email', password: 'hashedPassword' };

      const findOneSpy = jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(user as User);

      const compareSpy = jest
        .spyOn(bcrypt, 'compare')
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .mockImplementation((password, hashedPassword) => false);

      await expect(
        authService.authenticate(user.email, 'wrongPassword'),
      ).rejects.toThrow(BadRequestException);
      expect(findOneSpy).toHaveBeenCalledWith({ where: { email: user.email } });
      expect(compareSpy).toHaveBeenCalledWith('wrongPassword', user.password);
    });
  });

  describe('issueToken', () => {
    const user = { id: 1, role: Role.user };
    const token = 'token';

    beforeEach(() => {
      jest.spyOn(mockedConfigService, 'get').mockReturnValue('secret');
    });

    it('should issue an access token', async () => {
      const signAsyncSpy = jest
        .spyOn(jwtService, 'signAsync')
        .mockResolvedValue(token);

      const result = await authService.issueToken(user as User, false);

      expect(signAsyncSpy).toHaveBeenCalledWith(
        { sub: user.id, type: 'access', role: user.role },
        { expiresIn: '1h', secret: 'secret' },
      );
      expect(result).toEqual(token);
    });

    it('should issue an refresh token', async () => {
      const signAsyncSpy = jest
        .spyOn(jwtService, 'signAsync')
        .mockResolvedValue(token);

      const result = await authService.issueToken(user as User, true);

      expect(signAsyncSpy).toHaveBeenCalledWith(
        { sub: user.id, type: 'refresh', role: user.role },
        { expiresIn: '24h', secret: 'secret' },
      );
      expect(result).toEqual(token);
    });
  });

  describe('login', () => {
    it('should login a user and return tokens', async () => {
      const email = 'email@example.com';
      const password = 'password';
      const rawToken =
        'Basic ' + Buffer.from(`${email}:${password}`).toString('base64');
      const user = { id: 1, role: Role.user };

      const parseBasicTokenSpy = jest
        .spyOn(authService, 'parseBasicToken')
        .mockReturnValue({ email, password });
      const authenticateSpy = jest
        .spyOn(authService, 'authenticate')
        .mockResolvedValue(user as User);
      const issueTokenSpy = jest
        .spyOn(authService, 'issueToken')
        .mockResolvedValue('mock.token');

      const result = await authService.login(rawToken);

      expect(parseBasicTokenSpy).toHaveBeenCalledWith(rawToken);
      expect(authenticateSpy).toHaveBeenCalledWith(email, password);
      expect(issueTokenSpy).toHaveBeenCalledTimes(2);
      expect(issueTokenSpy).toHaveBeenNthCalledWith(1, user, true);
      expect(issueTokenSpy).toHaveBeenNthCalledWith(2, user, false);
      expect(result).toEqual({
        refreshToken: 'mock.token',
        accessToken: 'mock.token',
      });
    });
  });
});
