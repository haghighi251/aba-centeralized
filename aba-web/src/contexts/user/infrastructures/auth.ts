import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials"
import { APIResponse } from "@/shared/types/APIResponse";
import { ITokens } from "@/contexts/user/types/tokens";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || "",
    }),
    GitHubProvider({
      clientId: process.env.AUTH_GITHUB_ID || "",
      clientSecret: process.env.AUTH_GITHUB_SECRET || "",
    }),
    CredentialsProvider({
      name: 'Credentials',
      // The credentials is used to generate a suitable form on the sign in page.
      // You can specify whatever fields you are expecting to be submitted.
      // e.g. domain, username, password, 2FA token, etc.
      // You can pass any HTML attribute to the <input> tag through the object.
      credentials: {
        username: { label: "Username", type: "text", placeholder: "name@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        // You need to provide your own logic here that takes the credentials
        // submitted and returns either a object representing a user or value
        // that is false/null if the credentials are invalid.
        // e.g. return { id: 1, name: 'J Smith', email: 'jsmith@example.com' }
        // You can also use the `req` object to obtain additional parameters
        // (i.e., the request IP address)
        const res = await fetch("/your/endpoint", {
          method: 'POST',
          body: JSON.stringify(credentials),
          headers: { "Content-Type": "application/json" }
        })
        const user = await res.json()
  
        // If no error and we have user data, return it
        if (res.ok && user) {
          return user
        }
        // Return null if user data could not be retrieved
        return null
      }
    })
  ],
  callbacks: {
    // async signIn() {
    //   return true;
    // },
    // async redirect({ url, baseUrl }) {
    //   return baseUrl;
    // },
    // async session({ session, user, token }) {
    //   return session;
    // },
    async jwt({ token, account }) {
      // Persist the OAuth access_token to the token right after sign-in
      if (account && account.provider === "google") {
        const response = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + "/auth/google", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id_token: account.id_token,
          }),
        });

        const result: APIResponse = await response.json();

        if (result.success) {
          const serverToken = result.data as unknown as ITokens;
          token.accessToken = serverToken.accessToken;
          token.refreshToken = serverToken.refreshToken;
        }
      } else if (account && account.provider === "github") {
        const response = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + "/auth/github", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id_token: account.access_token,
          }),
        });

        const result: APIResponse = await response.json();

        if (result.success) {
          const serverToken = result.data as unknown as ITokens;
          token.accessToken = serverToken.accessToken;
          token.refreshToken = serverToken.refreshToken;
        }
      } else if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
  },
});