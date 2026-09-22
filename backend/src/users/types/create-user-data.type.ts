import { AuthProvider } from 'src/common/authProvider.enum';
import { UserRole } from 'src/common/userRoles.enum';

export type CreateUserData = {
  name: string;
  email: string;
  phone: string;
  password_hash: string | null;

  country?: string;
  address?: string;
  city?: string;
  roles?: UserRole[];

  authProvider?: AuthProvider;
  providerId?: string | null;

  isEmailVerified?: boolean;
};
