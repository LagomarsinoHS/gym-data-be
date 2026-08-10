import { UUID } from 'node:crypto';
import { Role } from './role.enum';

export type CreateUserData = {
  id: UUID;
  email: string;
  password: string;
  role: Role;
  profile: {
    firstName: string;
    lastName: string;
  };
};
