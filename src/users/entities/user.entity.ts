import { users } from '@prisma/client';

export type UserEntity = Omit<users, 'password_hash'>;
