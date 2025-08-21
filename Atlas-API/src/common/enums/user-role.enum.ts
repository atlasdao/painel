export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export const isAdmin = (role: string | undefined): boolean => {
  return role?.toUpperCase() === UserRole.ADMIN;
};

export const isUser = (role: string | undefined): boolean => {
  return role?.toUpperCase() === UserRole.USER;
};

export const normalizeRole = (role: string | undefined): UserRole => {
  const upperRole = role?.toUpperCase();
  if (upperRole === 'ADMIN') return UserRole.ADMIN;
  return UserRole.USER; // Default to USER
};