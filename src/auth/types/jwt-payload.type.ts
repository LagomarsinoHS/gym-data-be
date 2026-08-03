import { Role } from '../../users/types/role.enum';

export type JwtPayload = {
  sub: string;
  role: Role;
};

export type AuthenticatedUser = {
  userId: string;
  role: Role;
};
