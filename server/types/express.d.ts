declare namespace Express {
  interface User {
    claims?: {
      sub?: string;
      email?: string;
      [key: string]: unknown;
    };
  }
}
