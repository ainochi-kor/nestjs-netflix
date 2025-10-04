import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  constructor() {}

  @Cron('* * * * * *')
  getHello() {
    console.log('Called every second');
  }
}
