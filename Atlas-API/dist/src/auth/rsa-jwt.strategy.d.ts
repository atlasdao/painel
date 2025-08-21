import { Strategy } from 'passport-jwt';
export interface RsaJwtPayload {
    sub: string;
    scope: string[];
    iat: number;
    exp: number;
    jti: string;
    env: string;
    alg: string;
    typ?: string;
}
declare const RsaJwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class RsaJwtStrategy extends RsaJwtStrategy_base {
    constructor();
    validate(rawPayload: any): Promise<RsaJwtPayload>;
}
export {};
