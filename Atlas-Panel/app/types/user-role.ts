export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export const isAdmin = (role: string | undefined): boolean => {
  return role === UserRole.ADMIN;
};

export const isUser = (role: string | undefined): boolean => {
  return role === UserRole.USER;
};

export const getRoleLabel = (role: string): string => {
  switch (role) {
    case UserRole.ADMIN:
      return 'Administrador';
    case UserRole.USER:
      return 'Usuário';
    default:
      return 'Usuário';
  }
};