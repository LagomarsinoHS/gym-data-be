import { SetMetadata } from '@nestjs/common';
import { Role } from '../../users/types/role.enum';

export const ROLES_KEY = 'roles';

/** Restrict a route to one or more roles. Use with RolesGuard after JwtAuthGuard. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
