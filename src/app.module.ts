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
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthGuard } from './auth/guard/auth.guard';
import { RBACGuard } from './auth/guard/rbac.guard';
import { ResponseTimeInterceptor } from './common/interceptor/response-time.interceptor';
// import { ForbiddenExceptionFilter } from './common/filter/forbidden.filter';
import { QueryFailedExceptionFilter } from './common/filter/query-failed.filter';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottleInterceptor } from './common/interceptor/throttle.interceptor';

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
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      serveRoot: '/public/',
    }),
    MovieModule,
    DirectorModule,
    GenreModule,
    AuthModule,
    UserModule,
    CacheModule.register({
      ttl: 3000, // 3초
      isGlobal: true,
    }),
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
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTimeInterceptor,
    },
    // {
    //   provide: APP_FILTER,
    //   useClass: ForbiddenExceptionFilter,
    // },
    {
      provide: APP_FILTER,
      useClass: QueryFailedExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ThrottleInterceptor,
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
