import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { MovieModule } from './movie/movie.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DirectorModule } from './director/director.module';
import { GenreModule } from './genre/genre.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import * as Joi from 'joi';
import { ENV } from './common/const/env.const';
import { BearerTokenMiddleware } from './auth/middleware/bearer-token.middleware';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth/guard/auth.guard';
import { RBACGuard } from './auth/guard/rbac.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Use environment variables globally
      validationSchema: Joi.object({
        ENV: Joi.string().valid('dev', 'prod').required(),
        DB_TYPE: Joi.string().required(),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().required(),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_DATABASE: Joi.string().required(),
        HASH_ROUNDS: Joi.number().default(10),
        ACCESS_TOKEN_SECRET: Joi.string().required(),
        REFRESH_TOKEN_SECRET: Joi.string().required(),
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: configService.get<string>(ENV.DB_TYPE) as 'postgres',
        host: configService.get<string>(ENV.DB_HOST),
        port: configService.get<number>(ENV.DB_PORT),
        username: configService.get<string>(ENV.DB_USERNAME),
        password: configService.get<string>(ENV.DB_PASSWORD),
        database: configService.get<string>(ENV.DB_DATABASE),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get<string>(ENV.ENV) === 'dev', // dev일 때만 true
      }),
      inject: [ConfigService],
    }),
    MovieModule,
    DirectorModule,
    GenreModule,
    AuthModule,
    UserModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RBACGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(BearerTokenMiddleware)
      .exclude(
        {
          path: 'auth/login',
          method: RequestMethod.POST,
        },
        {
          path: 'auth/register',
          method: RequestMethod.POST,
        },
      )
      .forRoutes('*');
  }
}
