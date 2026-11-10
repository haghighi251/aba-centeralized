import { Account, Session, User } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { APIResponse } from "@/shared/types/APIResponse";
import { ITokens } from "@/contexts/user/types/tokens";
import { JWT } from "next-auth/jwt";
import { loginWithCredentials } from "@/contexts/user/services/authService";
import { logger } from "@/contexts/shared/utils/logger";
import { refreshTokens } from "@/contexts/user/services/refreshTokens";

type CustomJWT = JWT & {
  id?: string;
  role?: string;
  companyId?: string;
  tokens?: ITokens;
};

type CustomSession = Session & {
  user: Session["user"] & {
    id?: string;
    role?: string;
    companyId?: string;
    tokens?: ITokens;
  };
};

type CustomUser = User & {
  role?: string;
  companyId?: string;
  tokens?: ITokens;
};

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || "",
    }),
    GithubProvider({
      clientId: process.env.AUTH_GITHUB_ID || "",
      clientSecret: process.env.AUTH_GITHUB_SECRET || "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: Record<string, string> | undefined) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const { user, tokens } = await loginWithCredentials(
            credentials.email,
            credentials.password,
          );

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            companyId: user.companyId,
            tokens,
          };
        } catch (error) {
          throw new Error(
            error instanceof Error ? error.message : "Invalid credentials",
          );
        }
      },
    }),
  ],

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    async signIn() {
      return true;
    },

    async session({ session, token }: { session: CustomSession; token: CustomJWT }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role;
        session.user.companyId = token.companyId;
        session.user.tokens = token.tokens;
      }
      return session;
    },

    async jwt({ token, user, account }: { token: CustomJWT; user?: CustomUser; account: Account | null }) {
      if (user) {
        token.id = user.id;
        token.role = (user as CustomUser).role;
        token.companyId = (user as CustomUser).companyId;
        token.tokens = user.tokens;
      }

      if (account?.provider === "google") {
        const response = await fetch(
          (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL) +
            "/auth/google",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_token: account.id_token }),
          },
        );
        const result: APIResponse = await response.json();
        if (result.success) {
          token.tokens = result.data as unknown as ITokens;
        }
      }

      if (account?.provider === "github") {
        const response = await fetch(
          (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL) +
            "/auth/github",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_token: account.access_token }),
          },
        );
        const result: APIResponse = await response.json();
        if (result.success) {
          token.tokens = result.data as unknown as ITokens;
        }
      }

      if (token.tokens) {
        const now = Math.floor(Date.now() / 1000);
        const EXPIRY_BUFFER = 5 * 60;
        if (token.tokens.accessTokenExpires - now <= EXPIRY_BUFFER) {
          try {
            token.tokens = await refreshTokens(token.tokens.refreshToken);
            logger.info("Tokens refreshed successfully");
          } catch (error) {
            logger.error({
              message: "Token refresh failed – logging out",
              error: (error as Error).message,
            });
            token.tokens = undefined;
          }
        }
      }

      return token;
    },
  },
};
