"use client";
import React, { useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import HistoryIcon from "@mui/icons-material/History";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import GitHubIcon from "@mui/icons-material/GitHub";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import { useServicePackages } from "@/modules/service-package/hooks/useServicePackages";
import {
  createServicePackage,
  updateServicePackage,
  deleteServicePackage,
  bulkImportServicePackages,
  updateServicePackageNotification,
  getServicePackageErrorMessage,
} from "@/modules/service-package/services/servicePackageService";
import { queryClient } from "@/components/ReactQueryProvider/ReactQueryProvider";
import { QueryKey } from "@/modules/shared/types/QueryKey";
import PackagesTable from "@/modules/service-package/components/PackagesTable/PackagesTable";
import PackageFormDialog from "@/modules/service-package/components/PackageFormDialog/PackageFormDialog";
import PackageHistoryDialog from "@/modules/service-package/components/PackageHistoryDialog/PackageHistoryDialog";
import BulkImportDialog from "@/modules/service-package/components/BulkImportDialog/BulkImportDialog";
import NotificationPreferenceDialog from "@/modules/service-package/components/NotificationPreferenceDialog/NotificationPreferenceDialog";
import type {
  ServicePackage,
  DependencyEcosystem,
  PackageFilter,
  CreatePackagePayload,
  UpdatePackagePayload,
  BulkPackageItem,
  BulkImportResult,
  UpdateNotificationPreferencePayload,
} from "@/modules/service-package/types/types";

const MANAGER_ROLES = ["BUSINESS_OWNER", "BUSINESS_ADMIN"];

const ECOSYSTEM_OPTIONS: Array<DependencyEcosystem | ""> = [
  "", "NPM", "PYPI", "MAVEN", "RUBYGEMS", "NUGET", "GO", "OTHER",
];

export default function PackagesPage() {
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

  // Filters
  const [search, setSearch] = useState("");
  const [ecosystemFilter, setEcosystemFilter] = useState<DependencyEcosystem | "">("");

  const filter: PackageFilter = {
    search: search || undefined,
    ecosystem: ecosystemFilter || undefined,
  };

  const { data, isLoading, error: fetchError } = useServicePackages(
    companyId,
    environmentId,
    serviceId,
    filter,
    accessToken,
  );
  const packages = data?.data ?? [];

  // Page-level error (for mutations)
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Add/Edit dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServicePackage | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // History dialog
  const [historyOpen, setHistoryOpen] = useState(false);

  // Bulk import dialog
  const [bulkOpen, setBulkOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkImportResult | null>(null);

  // Notification preference dialog (mute/snooze/unmute)
  const [notificationTarget, setNotificationTarget] = useState<ServicePackage | null>(null);
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: [QueryKey.ServicePackages, companyId, environmentId, serviceId],
    });
  }, [companyId, environmentId, serviceId]);

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (pkg: ServicePackage) => {
    setEditing(pkg);
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
  };

  const handleSave = async (payload: CreatePackagePayload | UpdatePackagePayload) => {
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await updateServicePackage(
          companyId,
          environmentId,
          serviceId,
          editing.id,
          payload as UpdatePackagePayload,
          accessToken,
        );
      } else {
        await createServicePackage(
          companyId,
          environmentId,
          serviceId,
          payload as CreatePackagePayload,
          accessToken,
        );
      }
      invalidate();
      setFormOpen(false);
    } catch (e) {
      setFormError(
        getServicePackageErrorMessage(
          e,
          editing ? "Failed to update package." : "Failed to add package.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pkg: ServicePackage) => {
    if (!confirm(`Remove package "${pkg.package.name}" from this service?`)) return;
    setMutationError(null);
    try {
      await deleteServicePackage(companyId, environmentId, serviceId, pkg.id, accessToken);
      invalidate();
    } catch (e) {
      setMutationError(getServicePackageErrorMessage(e, "Failed to remove package."));
    }
  };

  const handleBulkImport = async (
    pkgs: BulkPackageItem[],
    ecosystem: DependencyEcosystem,
  ) => {
    setImporting(true);
    setBulkError(null);
    setBulkResult(null);
    try {
      const result = await bulkImportServicePackages(
        companyId,
        environmentId,
        serviceId,
        { ecosystem, packages: pkgs },
        accessToken,
      );
      setBulkResult(result);
      invalidate();
    } catch (e) {
      setBulkError(getServicePackageErrorMessage(e, "Failed to import packages."));
    } finally {
      setImporting(false);
    }
  };

  const openBulk = () => {
    setBulkError(null);
    setBulkResult(null);
    setBulkOpen(true);
  };

  const openNotificationPreference = (pkg: ServicePackage) => {
    setNotificationError(null);
    setNotificationTarget(pkg);
  };

  const closeNotificationPreference = () => {
    if (notificationSaving) return;
    setNotificationTarget(null);
  };

  const handleNotificationSubmit = async (payload: UpdateNotificationPreferencePayload) => {
    if (!notificationTarget) return;
    setNotificationSaving(true);
    setNotificationError(null);
    try {
      await updateServicePackageNotification(
        companyId,
        environmentId,
        serviceId,
        notificationTarget.id,
        payload,
        accessToken,
      );
      invalidate();
      setNotificationTarget(null);
    } catch (e) {
      setNotificationError(
        getServicePackageErrorMessage(e, "Failed to update notification preference."),
      );
    } finally {
      setNotificationSaving(false);
    }
  };

  const goBack = () => {
    router.push(`/company/${companyId}/environments/${environmentId}`);
  };

  const pageError = fetchError?.message ?? null;

  return (
    <Box>
      {/* Breadcrumb */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <IconButton size="small" onClick={goBack} aria-label="Back to services">
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="body2" color="text.secondary">
          Services
        </Typography>
      </Box>

      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h5" fontWeight={700}>
          Packages
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<ShieldOutlinedIcon />}
            onClick={() =>
              router.push(
                `/company/${companyId}/environments/${environmentId}/services/${serviceId}/vulnerabilities`,
              )
            }
          >
            Security
          </Button>
          <Button
            variant="outlined"
            startIcon={<GitHubIcon />}
            onClick={() =>
              router.push(
                `/company/${companyId}/environments/${environmentId}/services/${serviceId}/repository`,
              )
            }
          >
            Repository
          </Button>
          <Button
            variant="outlined"
            startIcon={<ScienceOutlinedIcon />}
            onClick={() =>
              router.push(
                `/company/${companyId}/environments/${environmentId}/services/${serviceId}/tests`,
              )
            }
          >
            Tests
          </Button>
          <Button
            variant="outlined"
            startIcon={<HistoryIcon />}
            onClick={() => setHistoryOpen(true)}
          >
            View History
          </Button>
          {canManage && (
            <>
              <Button
                variant="outlined"
                startIcon={<UploadFileIcon />}
                onClick={openBulk}
              >
                Upload package.json
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openCreate}
              >
                Add Package
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* Page-level errors */}
      {(pageError || mutationError) && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setMutationError(null)}
        >
          {pageError ?? mutationError}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <TextField
          label="Search"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 220 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Ecosystem</InputLabel>
          <Select
            label="Ecosystem"
            value={ecosystemFilter}
            onChange={(e) =>
              setEcosystemFilter(e.target.value as DependencyEcosystem | "")
            }
          >
            {ECOSYSTEM_OPTIONS.map((eco) => (
              <MenuItem key={eco} value={eco}>
                {eco === "" ? "All" : eco}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {/* Table */}
      <PackagesTable
        packages={packages}
        loading={isLoading}
        canManage={canManage}
        onEdit={openEdit}
        onDelete={handleDelete}
        onNotificationPreference={openNotificationPreference}
      />

      {/* Add / Edit dialog */}
      <PackageFormDialog
        open={formOpen}
        editing={editing}
        saving={saving}
        error={formError}
        onClose={closeForm}
        onSave={handleSave}
      />

      {/* History dialog */}
      <PackageHistoryDialog
        open={historyOpen}
        companyId={companyId}
        environmentId={environmentId}
        serviceId={serviceId}
        accessToken={accessToken}
        onClose={() => setHistoryOpen(false)}
      />

      {/* Bulk import dialog */}
      <BulkImportDialog
        open={bulkOpen}
        importing={importing}
        error={bulkError}
        result={bulkResult}
        onClose={() => setBulkOpen(false)}
        onImport={handleBulkImport}
      />

      {/* Notification preference dialog (mute/snooze/unmute) */}
      <NotificationPreferenceDialog
        open={notificationTarget !== null}
        pkg={notificationTarget}
        saving={notificationSaving}
        error={notificationError}
        onClose={closeNotificationPreference}
        onSubmit={handleNotificationSubmit}
      />
    </Box>
  );
}
