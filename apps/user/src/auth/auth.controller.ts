import {
  Controller,
  UnauthorizedException,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { GrpcInterceptor, UserMicroservice } from '@app/common';

@Controller('auth')
@UserMicroservice.AuthServiceControllerMethods()
@UseInterceptors(GrpcInterceptor)
export class AuthController implements UserMicroservice.AuthServiceController {
  constructor(private readonly authService: AuthService) {}

  parseBearerToken(request: UserMicroservice.ParseBearerTokenRequest) {
    return this.authService.parseBearerToken(request.token, false);
  }

  registerUser(request: UserMicroservice.RegisterUserRequest) {
    const { token } = request;

    if (token === null) {
      throw new UnauthorizedException('Authorization token is required.');
    }

    return this.authService.register(token, request);
  }

  loginUser(request: UserMicroservice.LoginUserRequest) {
    const { token } = request;
    if (token === null) {
      throw new UnauthorizedException('Authorization token is required.');
    }

    return this.authService.login(token);
  }
}
