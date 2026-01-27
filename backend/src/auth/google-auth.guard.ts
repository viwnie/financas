import { Injectable, ExecutionContext, ServiceUnavailableException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private configService: ConfigService) {
    super();
  }

  private isEnabled() {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackUrl = this.configService.get<string>('GOOGLE_CALLBACK_URL');
    return Boolean(clientId && clientSecret && callbackUrl);
  }

  canActivate(context: ExecutionContext) {
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException('Google auth is not configured');
    }
    return super.canActivate(context);
  }
}
