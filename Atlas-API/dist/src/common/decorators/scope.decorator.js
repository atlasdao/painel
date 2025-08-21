"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Scope = exports.SCOPE_KEY = exports.RequireScope = void 0;
const common_1 = require("@nestjs/common");
const RequireScope = (scope) => (0, common_1.SetMetadata)('scope', scope);
exports.RequireScope = RequireScope;
exports.SCOPE_KEY = 'scope';
const Scope = (...scopes) => (0, common_1.SetMetadata)(exports.SCOPE_KEY, scopes);
exports.Scope = Scope;
//# sourceMappingURL=scope.decorator.js.map