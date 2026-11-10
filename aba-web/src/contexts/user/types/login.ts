import { ITokens } from "./tokens";

export interface ICredentials {
  username: string;
  password: string;
}

export interface ILoginResult {
  user: {
    id: string;
    name: string;
    email: string;
  };
  tokens: ITokens;
}