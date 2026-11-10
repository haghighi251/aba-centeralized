import { Session } from "next-auth";

export type RootLayoutProps = {
  session: Session | null | undefined;
  children: React.ReactNode;
};