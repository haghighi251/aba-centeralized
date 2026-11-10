"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import AdminSidebar, { SIDEBAR_WIDTH } from "@/shared/components/AdminSidebar/AdminSidebar";
import { UrlMapper } from "@/shared/types/URLMapper";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    const role = (session?.user as any)?.role;
    if (!role || !ADMIN_ROLES.includes(role)) {
      router.replace(UrlMapper.LOGIN);
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  const role = (session?.user as any)?.role;
  if (!role || !ADMIN_ROLES.includes(role)) return null;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AdminSidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: `${SIDEBAR_WIDTH}px`,
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
