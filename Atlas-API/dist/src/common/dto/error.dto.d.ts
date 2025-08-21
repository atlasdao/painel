export declare class ErrorResponseDto {
    statusCode: number;
    message: string;
    error: string;
    timestamp: string;
    path: string;
    requestId: string;
}
export declare class ValidationErrorDto extends ErrorResponseDto {
    errors: ValidationErrorItem[];
}
export declare class ValidationErrorItem {
    field: string;
    message: string;
}
