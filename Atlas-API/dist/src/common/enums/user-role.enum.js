"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeRole = exports.isUser = exports.isAdmin = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["USER"] = "USER";
    UserRole["ADMIN"] = "ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
const isAdmin = (role) => {
    return role?.toUpperCase() === UserRole.ADMIN;
};
exports.isAdmin = isAdmin;
const isUser = (role) => {
    return role?.toUpperCase() === UserRole.USER;
};
exports.isUser = isUser;
const normalizeRole = (role) => {
    const upperRole = role?.toUpperCase();
    if (upperRole === 'ADMIN')
        return UserRole.ADMIN;
    return UserRole.USER;
};
exports.normalizeRole = normalizeRole;
//# sourceMappingURL=user-role.enum.js.map