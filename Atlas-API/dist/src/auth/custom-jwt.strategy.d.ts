import { Strategy } from 'passport-jwt';
declare const CustomJwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class CustomJwtStrategy extends CustomJwtStrategy_base {
    constructor();
    validate(payload: any): Promise<any>;
}
export {};
