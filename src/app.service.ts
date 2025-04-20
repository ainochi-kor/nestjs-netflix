import { Injectable } from '@nestjs/common';

export interface Movie {
  id: number;
  title: string;
}
@Injectable()
export class AppService {
  #movies: Movie[] = [
    {
      id: 1,
      title: '해리포터',
    },
    {
      id: 2,
      title: '반지의 제왕',
    },
  ];
  #idCounter = 3;

  getManyMovies(title?: string) {
    if (!title) {
      return this.#movies;
    }

    return this.#movies.filter((movie) => movie.title.startsWith(title));
  }
}
