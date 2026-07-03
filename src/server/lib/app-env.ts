import type { AuthVariables } from "./auth-middleware";

export type BunRequestServer = {
  requestIP(request: Request): { address: string; port: number } | null;
};

export type AppEnv = {
  Bindings: {
    SERVER?: BunRequestServer;
  };
  Variables: AuthVariables;
};
