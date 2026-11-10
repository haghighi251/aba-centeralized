"use client";
import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useRepositoryConnection } from "@/modules/repository-connection/hooks/useRepositoryConnection";
import { queryClient } from "@/components/ReactQueryProvider/ReactQueryProvider";
import { QueryKey } from "@/modules/shared/types/QueryKey";
import RepositoryConnectionCard from "@/modules/repository-connection/components/RepositoryConnectionCard/RepositoryConnectionCard";

const MANAGER_ROLES = ["BUSINESS_OWNER", "BUSINESS_ADMIN"];

export default function RepositoryConnectionPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();

  const companyId = params.id as string;
  const environmentId = Number(params.envId);
  const serviceId = Number(params.serviceId);

  const user = session?.user as { tokens?: { accessToken?: string }; role?: string } | undefined;
  const accessToken = user?.tokens?.accessToken ?? "";
  const role = user?.role ?? "";
  const canManage = MANAGER_ROLES.includes(role);

  const { data: connection, isLoading, error: fetchError } = useRepositoryConnection(
    companyId,
    environmentId,
    serviceId,
    accessToken,
  );

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: [QueryKey.RepositoryConnection, companyId, environmentId, serviceId],
    });
  }, [companyId, environmentId, serviceId]);

  const goBack = () => {
    router.push(`/company/${companyId}/environments/${environmentId}/services/${serviceId}/packages`);
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <IconButton size="small" onClick={goBack} aria-label="Back to packages">
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="body2" color="text.secondary">
          Packages
        </Typography>
      </Box>

      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Repository Connection
      </Typography>

      {fetchError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {fetchError.message}
        </Alert>
      )}

      <RepositoryConnectionCard
        companyId={companyId}
        environmentId={environmentId}
        serviceId={serviceId}
        accessToken={accessToken}
        connection={connection ?? null}
        loading={isLoading}
        canManage={canManage}
        onChanged={invalidate}
      />
    </Box>
  );
}
