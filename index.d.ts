// Type definitions for @adobe/jwt-auth 0.3
// Project: https://github.com/adobe/jwt-auth#readme
// Definitions by: Andrew Leedham <https://andrewleedham.me>

export = authorize;

declare function authorize(
  options: authorize.JWTAuthConfig
): Promise<authorize.JWTAuthResponse>;

declare namespace authorize {
  export interface JWTAuthConfig {
    clientId: string;
    technicalAccountId: string;
    orgId: string;
    clientSecret: string;
    privateKey: string;
    passphrase?: string;
    metaScopes: string | string[];
    ims?: string;
  }

  export interface JWTAuthResponse {
    token_code: string;
    access_token: string;
    expires_in: string;
  }
}
