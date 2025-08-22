import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
declare const CustomJwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class CustomJwtStrategy extends CustomJwtStrategy_base {
    private readonly configService;
    constructor(configService: ConfigService);
    validate(payload: any): Promise<{
        id: any;
        sub: any;
        email: any;
        username: any;
        roles: any;
        role: any;
        scope: any;
    }>;
}
export {};
