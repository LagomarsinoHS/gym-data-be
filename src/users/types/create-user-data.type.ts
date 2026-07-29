import { UUID } from 'node:crypto';
import { Role } from './role.enum';

export type CreateUserData = {
  id: UUID;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: Role;
};
