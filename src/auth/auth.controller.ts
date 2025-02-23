import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signup-req.dto';
import { SignInDto } from './dto/signin-req.dto';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { SignInResponseDto } from './dto/signin-res.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiResponse({ status: 201 })
  async signUp(@Body() signUpDto: SignUpDto) {
    try {
      await this.authService.signUp(
        signUpDto.username,
        signUpDto.email,
        signUpDto.password,
      );
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Post('signin')
  @ApiResponse({ status: 200, type: SignInResponseDto })
  async signIn(@Body() signInDto: SignInDto): Promise<SignInResponseDto> {
    const user = await this.authService.validateUser(
      signInDto.email,
      signInDto.password,
    );

    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    return this.authService.login(user);
  }
}
