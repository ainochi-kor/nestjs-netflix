import { ApiHideProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { CreateDateColumn, UpdateDateColumn, VersionColumn } from 'typeorm';

export class BaseTable {
  @CreateDateColumn()
  @Exclude() // 추출 시, createdAt 제외
  @ApiHideProperty()
  createdAt: Date;

  @UpdateDateColumn()
  @Exclude() // 추출 시, updatedAt 제외
  @ApiHideProperty()
  updatedAt: Date;

  @VersionColumn()
  @Exclude() // 추출 시, version 제외
  @ApiHideProperty()
  version: number;
}
