import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from 'src/app.module';

describe('MovieController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true, // class의 타입스크립트 타입 기반으로 타입 변환
        },
      }),
    );
    await app.init();
  });

  describe('[GET /movie]', () => {
    it('should get all movies', async () => {
      const { body, statusCode } = await request(app.getHttpServer()).get(
        '/movie',
      );

      expect(statusCode).toBe(200);
    });
  });
});
