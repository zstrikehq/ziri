import type { AuthConfig } from './types';
export interface AuthProvider {
    getToken(): Promise<string>;
    testConnection(): Promise<{
        success: boolean;
        error?: string;
    }>;
    clearToken(): void;
}
export declare class M2MAuthProvider implements AuthProvider {
    private config;
    private token;
    private tokenExpiry;
    constructor(config: AuthConfig);
    private generateId;
    getToken(): Promise<string>;
    testConnection(): Promise<{
        success: boolean;
        error?: string;
    }>;
    clearToken(): void;
}
