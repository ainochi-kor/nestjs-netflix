import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { readdir, unlink } from 'fs/promises';
import { join, parse } from 'path';
import { Movie } from 'src/movie/entity/movie.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
  ) {}

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

  @Cron('0 * * * * *')
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
}
