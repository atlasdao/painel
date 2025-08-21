import { Strategy } from 'passport-jwt';
export interface ExternalJwtPayload {
    sub: string;
    scope: string[];
    iat: number;
    exp: number;
    jti: string;
    env: string;
    alg: string;
    typ: string;
}
declare const ExternalJwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class ExternalJwtStrategy extends ExternalJwtStrategy_base {
    constructor();
    validate(payload: ExternalJwtPayload): Promise<ExternalJwtPayload>;
}
export {};
