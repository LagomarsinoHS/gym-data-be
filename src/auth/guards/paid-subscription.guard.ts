import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { AuthenticatedUser } from '../types/jwt-payload.type';

/**
 * Requires JwtAuthGuard first. Loads the user and rejects `free` / expired paid plans.
 * Subscription lives in Mongo, not in the JWT.
 */
@Injectable()
export class PaidSubscriptionGuard implements CanActivate {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest<{
      user: AuthenticatedUser;
    }>();
    await this.usersService.requirePaidSubscription(user.userId);
    return true;
  }
}
