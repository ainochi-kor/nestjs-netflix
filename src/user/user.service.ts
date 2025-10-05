import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { ENV } from 'src/common/const/env.const';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>, // UserRepository 주입
    private readonly configService: ConfigService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { email, password } = createUserDto;

    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (user) {
      throw new BadRequestException('이미 가입한 이메일입니다.');
    }

    const hashRounds = this.configService.get<number>(ENV.HASH_ROUNDS) ?? 10;
    const hashedPassword = await bcrypt.hash(password, hashRounds);
    await this.userRepository.save({
      email,
      password: hashedPassword,
    });

    return this.userRepository.findOne({ where: { email } });
  }

  async findAll() {
    return await this.userRepository.find();
  }

  async findOne(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('존재하지 않는 사용자입니다.');
    }

    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({ where: { id } });
    const { password } = updateUserDto;

    if (!user) {
      throw new NotFoundException('존재하지 않는 사용자입니다.');
    }

    let newPassword = user.password;

    if (password) {
      newPassword = await bcrypt.hash(
        password,
        this.configService.get<number>(ENV.HASH_ROUNDS) ?? 10,
      );
    }

    await this.userRepository.update(
      { id },
      {
        ...updateUserDto,
        password: newPassword,
      },
    );

    return this.userRepository.findOne({ where: { id } });
  }

  async remove(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('존재하지 않는 사용자입니다.');
    }

    await this.userRepository.remove(user);

    return id;
  }
}
