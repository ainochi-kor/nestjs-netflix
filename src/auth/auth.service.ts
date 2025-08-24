import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  parseBasicToken(rawToken: string) {
    const basicSplit = rawToken.split(' ');
    if (basicSplit.length !== 2 || basicSplit[0] !== 'Basic') {
      throw new BadRequestException('올바른 형식의 토큰이 아닙니다.');
    }
    const base64Credentials = basicSplit[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString(
      'utf-8',
    );
    const tokenSplit = credentials.split(':');

    if (tokenSplit.length !== 2) {
      throw new BadRequestException('올바른 형식의 토큰이 아닙니다.');
    }

    return { email: tokenSplit[0], password: tokenSplit[1] };
  }

  async register(rawToken: string) {
    const { email, password } = this.parseBasicToken(rawToken);

    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (user) {
      throw new BadRequestException('이미 가입한 이메일입니다.');
    }

    const hashRounds = this.configService.get<number>('HASH_ROUNDS') ?? 10;
    const hashedPassword = await bcrypt.hash(password, hashRounds);
    const newUser = this.userRepository.create({
      email,
      password: hashedPassword,
    });

    await this.userRepository.save(newUser);

    return this.userRepository.findOne({ where: { email } });
  }
}
