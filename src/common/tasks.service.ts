import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { readdir, unlink } from 'fs/promises';
import { join, parse } from 'path';
import { Movie } from 'src/movie/entity/movie.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  @Cron('* * * * * *')
  logEverySecond() {
    // 로그 레벨 순위
    this.logger.fatal('FATAL 레벨 로그'); // 치명적인 에러, 시스템 다운 등
    this.logger.error('ERROR 레벨 로그'); // 에러 발생 시
    this.logger.warn('WARN 레벨 로그'); // 주의가 필요한 상황
    this.logger.log('LOG 레벨 로그'); // 운영 시, 중요한 정보 기록할 때
    this.logger.debug('DEBUG 레벨 로그'); // 개발 시, 확인하기 위해 찍는 로그
    this.logger.verbose('VERBOSE 레벨 로그'); // 호기심에 찍어보는 로그
  }

  // @Cron('* * * * * *')
  async earseOrphanedFiles() {
    const file = await readdir(join(process.cwd(), 'public', 'temp'));

    const deleteTargetsFiles = file.filter((file) => {
      const filename = parse(file).name;
      const split = filename.split('_');

      if (split.length !== 2) {
        return true;
      }

      try {
        const date = new Date(parseInt(split[split.length - 1]));
        const aDayInMilliSeconds = 24 * 60 * 60 * 1000;

        const now = new Date();
        return now.getTime() - date.getTime() > aDayInMilliSeconds;
      } catch {
        return true;
      }
    });

    await Promise.all(
      deleteTargetsFiles.map(async (file) => {
        try {
          await unlink(join(process.cwd(), 'public', 'temp', file));
        } catch (e) {
          console.error(e);
        }
      }),
    );

    console.log('deleteTargetsFiles', deleteTargetsFiles);
  }

  // @Cron('0 * * * * *')
  async calculateMovieLikeCounts() {
    console.log('run');

    await this.movieRepository.query(`
      UPDATE movie m 
      SET "likeCount" = (
        SELECT count(*) FROM movie_user_like mul WHERE m.id = mul."movieId" AND mul."isLike" = true
      )
    `);

    await this.movieRepository.query(`
      UPDATE movie m 
      SET "dislikeCount" = (
        SELECT count(*) FROM movie_user_like mul WHERE m.id = mul."movieId" AND mul."isLike" = false
      )
    `);

    console.log('end');
  }

  // @Cron('* * * * * *', {
  //   name: 'printer',
  // })
  printer() {
    console.log('printer');
  }

  // @Cron('*/5 * * * * *')
  async stoper() {
    console.log('stoper');

    const job = this.schedulerRegistry.getCronJob('printer');

    console.log({
      lastDate: job.lastDate(),
      nextDate: job.nextDate(),
      nextDates: job.nextDates(5),
      isActive: job.isActive,
    });

    if (job.isActive) {
      await job.stop();
    } else {
      job.start();
    }
  }
}
