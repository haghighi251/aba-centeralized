import { ReactElement, ReactNode } from "react";

// ToastProvider ensures toast hooks work in client components like RegistrationForm
import { ToastProvider } from "@/modules/shared/components/ToastContextProvider/ToastContextProvider";
// Footer component removed while migrating to NextAuth Google sign-in
// import Footer from "@/types/components/Footer/Footer";

type BaseLayoutProps = {
  header?: ReactElement;
  children: ReactNode;
  footer?: ReactElement;
};

export const BaseLayout = ({
  header = <></>,
  // Footer default removed — will be handled by NextAuth integration
  footer = <></>,
  children,
}: BaseLayoutProps) => {
  return (
    <ToastProvider>
      <div id="app">
        {header}
        {children}
        {footer}
      </div>
    </ToastProvider>
  );
};
