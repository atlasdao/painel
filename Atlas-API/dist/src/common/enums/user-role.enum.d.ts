export declare enum UserRole {
    USER = "USER",
    ADMIN = "ADMIN"
}
export declare const isAdmin: (role: string | undefined) => boolean;
export declare const isUser: (role: string | undefined) => boolean;
export declare const normalizeRole: (role: string | undefined) => UserRole;
