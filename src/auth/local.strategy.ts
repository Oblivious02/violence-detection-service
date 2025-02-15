import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Extract JWT from the Authorization header
      ignoreExpiration: false, // Ensure the token is not expired
      secretOrKey: 'your_secret_key', // Replace with your actual secret key (keep it secure!)
    });
  }

  validate(payload: any) {
    // This payload will contain the decoded JWT (e.g., { email: 'user@example.com', sub: '123' })
    return { userId: payload.sub, email: payload.email };
  }
}
