"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import CompanySidebar, { COMPANY_SIDEBAR_WIDTH } from "@/shared/components/CompanySidebar/CompanySidebar";
import { UrlMapper } from "@/shared/types/URLMapper";

const BUSINESS_ROLES = ["BUSINESS_OWNER", "BUSINESS_ADMIN", "BUSINESS_MEMBER"];

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const routeId = params.id as string;

  const user = session?.user as any;
  const role      = user?.role as string | undefined;
  const companyId = user?.companyId as string | undefined;

  useEffect(() => {
    if (status === "loading") return;

    if (!role || !BUSINESS_ROLES.includes(role)) {
      router.replace(UrlMapper.LOGIN);
      return;
    }
    // Prevent accessing another company's dashboard
    if (companyId && companyId !== routeId) {
      router.replace(`/company/${companyId}`);
    }
  }, [status, role, companyId, routeId, router]);

  if (status === "loading") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!role || !BUSINESS_ROLES.includes(role)) return null;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <CompanySidebar
        companyId={routeId}
        companyName={user?.name ?? "My Company"}
        userName={user?.name ?? ""}
        role={role}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: `${COMPANY_SIDEBAR_WIDTH}px`,
          p: 3,
          backgroundColor: "background.default",
          minHeight: "100vh",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
