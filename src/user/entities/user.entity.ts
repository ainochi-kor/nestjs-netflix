import { Exclude } from 'class-transformer';
import { BaseTable } from 'src/common/entity/base-table.entity';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum Role {
  admin,
  paidUser, // 유료 사용자
  user, // 일반 사용자
}

@Entity()
export class User extends BaseTable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude({
    // toClassOnly: true, // 요청 시 제외
    toPlainOnly: true, // 응답 시 제외
  })
  password: string;

  @Column({
    enum: Role,
    default: Role.user,
  })
  role: Role;
}
