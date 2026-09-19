import { AuthProvider } from 'src/common/authProvider.enum';

export type CreateUserData = {
  name: string;
  email: string;
  phone: string;
  password_hash: string | null;

  country?: string;
  address?: string;
  city?: string;

  authProvider?: AuthProvider;
  providerId?: string | null;
};
