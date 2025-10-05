import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Role, User } from 'src/user/entities/user.entity';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  blockToken: jest.fn(),
  parseBearerToken: jest.fn(),
  issueToken: jest.fn(),
};

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();
    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(authController).toBeDefined();
  });

  describe('registerUser', () => {
    it('should register a user and return it', async () => {
      const token = `Basic dGVzdA==`;
      const result = { id: 1, email: 'test@example.com' };

      const registerSpy = jest
        .spyOn(mockAuthService, 'register')
        .mockResolvedValue(result as User);

      await expect(authController.registerUser(token)).resolves.toEqual(result);
      expect(registerSpy).toHaveBeenCalledWith(token);
    });
  });

  describe('loginUser', () => {
    it('should login a user and return tokens', async () => {
      const token = `Basic dGVzdA==`;
      const result = {
        refreshToken: 'refreshToken',
        accessToken: 'accessToken',
      };

      const loginSpy = jest
        .spyOn(mockAuthService, 'login')
        .mockResolvedValue(result);

      await expect(authController.loginUser(token)).resolves.toEqual(result);
      expect(loginSpy).toHaveBeenCalledWith(token);
    });
  });

  describe('blockToken', () => {
    it('should block a token', async () => {
      const token = 'some.token.value';
      const tokenBlockSpy = jest
        .spyOn(mockAuthService, 'blockToken')
        .mockResolvedValue(true);

      await expect(authController.blockToken(token)).resolves.toEqual(true);
      expect(tokenBlockSpy).toHaveBeenCalledWith(token);
    });
  });

  describe('rotateAccessToken', () => {
    it('should rotate and return a new access token', async () => {
      const accessToken = 'some.token.value';

      const payload = {
        id: 1,
        role: Role.user,
        type: 'access' as const,
      };

      const issueTokenSpy = jest
        .spyOn(authService, 'issueToken')
        .mockResolvedValue(accessToken);

      const parseBearerTokenSpy = jest
        .spyOn(authService, 'parseBearerToken')
        .mockResolvedValue(payload);

      const result = await authController.rotateAccessToken({ user: 'a' });

      expect(parseBearerTokenSpy).toHaveBeenCalled();
      expect(issueTokenSpy).toHaveBeenCalled();
      expect(result).toEqual({ accessToken });
    });
  });

  describe('loginUserWithPassport', () => {
    it('should login a user with passport and return tokens', async () => {
      const user = { id: 1, role: Role.user };
      const req = { user: user as User };
      const accessToken = 'mocked.access.token';
      const refreshToken = 'mocked.refresh.token';

      const issueTokenSpy = jest
        .spyOn(authService, 'issueToken')
        .mockResolvedValueOnce(refreshToken)
        .mockResolvedValueOnce(accessToken);

      const result: unknown = await authController.loginUserWithPassport(req);

      expect(issueTokenSpy).toHaveBeenCalledTimes(2);
      expect(issueTokenSpy).toHaveBeenNthCalledWith(1, user, true);
      expect(issueTokenSpy).toHaveBeenNthCalledWith(2, user, false);
      expect(result).toEqual({ refreshToken, accessToken });
    });
  });
});
