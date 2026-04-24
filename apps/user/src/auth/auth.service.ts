import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import { Repository } from 'typeorm';
import { User } from '../user/entity/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async register(rawToken: string, registerDto: RegisterDto) {
    const { email, password } = this.parseBasicToken(rawToken);

    return this.userService.create({
      ...registerDto,
      email,
      password,
    });
  }

  parseBasicToken(rawToken: string) {
    // Gateway registration/login uses HTTP Basic auth to transport email/password.
    const basicSplit = rawToken.split(' ');

    if (basicSplit.length !== 2) {
      throw new BadRequestException('Invalid token format.');
    }

    const [basic, token] = basicSplit;

    if (basic.toLowerCase() !== 'basic') {
      throw new BadRequestException('Invalid token format.');
    }

    const decoded = Buffer.from(token, 'base64').toString('utf-8');

    const tokenSplit = decoded.split(':');

    if (tokenSplit.length !== 2) {
      throw new BadRequestException('Invalid token format.');
    }

    const [email, password] = tokenSplit;

    return {
      email,
      password,
    };
  }

  async parseBearerToken(rawToken: string, isRefreshToken: boolean) {
    // Bearer parsing also enforces whether the caller expects an access or refresh token.
    const basicSplit = rawToken.split(' ');

    if (basicSplit.length !== 2) {
      throw new BadRequestException('Invalid token format.');
    }

    const [bearer, token] = basicSplit;

    if (bearer.toLowerCase() !== 'bearer') {
      throw new BadRequestException('Invalid token format.');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.getOrThrow<string>(
          isRefreshToken ? 'REFRESH_TOKEN_SECRET' : 'ACCESS_TOKEN_SECRET',
        ),
      });

      if (isRefreshToken) {
        if (payload.type !== 'refresh') {
          throw new BadRequestException('A refresh token is required.');
        }
      } else {
        if (payload.type !== 'access') {
          throw new BadRequestException('An access token is required.');
        }
      }

      return payload;
    } catch (e) {
      throw new UnauthorizedException('Token has expired.');
    }
  }

  async login(rawToken: string) {
    const { email, password } = this.parseBasicToken(rawToken);

    const user = await this.authenticate(email, password);

    return {
      refreshToken: await this.issueToken(user, true),
      accessToken: await this.issueToken(user, false),
    };
  }

  async authenticate(email: string, password: string) {
    const user = await this.userRepository.findOne({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        password: true,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid login credentials.');
    }

    const passOk = await bcrypt.compare(password, user.password);

    if (!passOk) {
      throw new BadRequestException('Invalid login credentials.');
    }

    return user;
  }

  async issueToken(user: any, isRefreshToken: boolean) {
    const refreshTokenSecret = this.configService.getOrThrow<string>(
      'REFRESH_TOKEN_SECRET',
    );
    const accessTokenSecret = this.configService.getOrThrow<string>(
      'ACCESS_TOKEN_SECRET',
    );

    return this.jwtService.signAsync(
      {
        sub: user.id ?? user.sub,
        role: user.role,
        type: isRefreshToken ? 'refresh' : 'access',
      },
      {
        secret: isRefreshToken ? refreshTokenSecret : accessTokenSecret,
        expiresIn: '3600h',
      },
    );
  }
}
