export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt?: Date;
}

export interface UserCreateDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'admin' | 'user';
}

export interface UserUpdateDto {
  firstName?: string;
  lastName?: string;
  password?: string;
  role?: 'admin' | 'user';
}
