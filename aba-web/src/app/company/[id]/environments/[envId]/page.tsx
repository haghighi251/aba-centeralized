"use client";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import CircularProgress from "@mui/material/CircularProgress";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  getServices,
  createService,
  updateService,
  deleteService,
  getServiceErrorMessage,
  Service,
  ServiceType,
  ServiceStatus,
  ServiceFilter,
  CreateServicePayload,
} from "@/contexts/service/services/serviceService";
import {
  getEnvironmentById,
  getEnvironmentErrorMessage,
  Environment,
} from "@/contexts/environment/services/environmentService";

const STATUS_OPTIONS: ServiceStatus[] = ["ACTIVE", "ARCHIVED"];

const TYPE_OPTIONS: ServiceType[] = [
  "BFF",
  "API_GATEWAY",
  "MICROSERVICE",
  "WORKER",
  "FRONTEND",
  "DATABASE",
  "CACHE",
  "MESSAGE_QUEUE",
  "OTHER",
];

const TYPE_LABEL: Record<ServiceType, string> = {
  BFF: "BFF",
  API_GATEWAY: "API Gateway",
  MICROSERVICE: "Microservice",
  WORKER: "Worker",
  FRONTEND: "Frontend",
  DATABASE: "Database",
  CACHE: "Cache",
  MESSAGE_QUEUE: "Message Queue",
  OTHER: "Other",
};

/**
 * Roles that are allowed to add, edit, or delete services.
 * BUSINESS_MEMBER is intentionally excluded — they can only view.
 */
const MANAGER_ROLES = ["BUSINESS_OWNER", "BUSINESS_ADMIN"];

interface ServiceFormState {
  name: string;
  type: ServiceType;
  description: string;
  baseUrl: string;
  rateLimitWindowMs: string;
  rateLimitMax: string;
  status: ServiceStatus;
}

const EMPTY_FORM: ServiceFormState = {
  name: "",
  type: "OTHER",
  description: "",
  baseUrl: "",
  rateLimitWindowMs: "",
  rateLimitMax: "",
  status: "ACTIVE",
};

/** Formats a `{ windowMs, max }` rate-limit config for table display, e.g. "100 / 60s". */
function formatRateLimit(rateLimitConfig?: Service["rateLimitConfig"]): string {
  if (!rateLimitConfig) return "—";
  const seconds = rateLimitConfig.windowMs / 1000;
  return `${rateLimitConfig.max} / ${seconds}s`;
}

export default function EnvironmentServicesPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;
  const environmentId = Number(params.envId);

  const user = session?.user as any;
  const accessToken = user?.tokens?.accessToken ?? "";
  const role = (user?.role ?? "") as string;
  const canManage = MANAGER_ROLES.includes(role);

  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ServiceType | "">("");
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | "">("");

  // Add/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // View dialog
  const [viewingService, setViewingService] = useState<Service | null>(null);

  const isEditing = editingService !== null;

  const load = useCallback(
    async (signal: { cancelled: boolean }) => {
      if (!accessToken) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const filter: ServiceFilter = {
          search: search || undefined,
          type: typeFilter || undefined,
          status: statusFilter || undefined,
        };
        const [environmentResult, servicesResult] = await Promise.all([
          getEnvironmentById(companyId, environmentId, accessToken),
          getServices(companyId, environmentId, filter, accessToken),
        ]);
        if (signal.cancelled) return;
        setEnvironment(environmentResult);
        setServices(servicesResult.data);
      } catch (e) {
        if (signal.cancelled) return;
        setError(getEnvironmentErrorMessage(e, "Failed to load environment."));
      } finally {
        if (!signal.cancelled) setLoading(false);
      }
    },
    [companyId, environmentId, accessToken, search, typeFilter, statusFilter],
  );

  useEffect(() => {
    const signal = { cancelled: false };
    load(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [load]);

  const goBack = () => {
    router.push(`/company/${companyId}/environments`);
  };

  const openViewDialog = (service: Service) => {
    setViewingService(service);
  };

  const closeViewDialog = () => {
    setViewingService(null);
  };

  const openCreateDialog = () => {
    setEditingService(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (service: Service) => {
    setEditingService(service);
    setForm({
      name: service.name,
      type: service.type,
      description: service.description ?? "",
      baseUrl: service.baseUrl,
      rateLimitWindowMs: service.rateLimitConfig ? String(service.rateLimitConfig.windowMs) : "",
      rateLimitMax: service.rateLimitConfig ? String(service.rateLimitConfig.max) : "",
      status: service.status,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogOpen(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const rateLimitConfig =
        form.rateLimitWindowMs.trim() !== "" && form.rateLimitMax.trim() !== ""
          ? { windowMs: Number(form.rateLimitWindowMs), max: Number(form.rateLimitMax) }
          : null;

      if (isEditing) {
        const updated = await updateService(
          companyId,
          environmentId,
          editingService.id,
          {
            name: form.name,
            type: form.type,
            description: form.description || null,
            baseUrl: form.baseUrl,
            rateLimitConfig,
            status: form.status,
          },
          accessToken,
        );
        setServices((prev) => prev.map((svc) => (svc.id === updated.id ? updated : svc)));
      } else {
        const payload: CreateServicePayload = {
          name: form.name,
          type: form.type,
          description: form.description || null,
          baseUrl: form.baseUrl,
          rateLimitConfig,
        };
        const created = await createService(companyId, environmentId, payload, accessToken);
        setServices((prev) => [...prev, created]);
      }
      setDialogOpen(false);
    } catch (e) {
      setFormError(
        getServiceErrorMessage(e, isEditing ? "Failed to update service." : "Failed to create service."),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (service: Service) => {
    if (!confirm(`Delete service "${service.name}"?`)) return;
    setError(null);
    try {
      await deleteService(companyId, environmentId, service.id, accessToken);
      setServices((prev) => prev.filter((svc) => svc.id !== service.id));
    } catch (e) {
      setError(getServiceErrorMessage(e, "Failed to delete service."));
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <IconButton size="small" onClick={goBack} aria-label="Back to environments">
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="body2" color="text.secondary">
          Environments
        </Typography>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h5" fontWeight={700}>
            {environment ? environment.name : "Environment"}
          </Typography>
          {environment && (
            <>
              <Chip label={environment.type} size="small" />
              <Chip
                label={environment.status}
                color={environment.status === "ACTIVE" ? "success" : "default"}
                size="small"
              />
            </>
          )}
        </Box>
        {canManage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
            Add Service
          </Button>
        )}
      </Box>

      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
        Services
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
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
          <InputLabel>Type</InputLabel>
          <Select
            label="Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ServiceType | "")}
          >
            <MenuItem value="">All</MenuItem>
            {TYPE_OPTIONS.map((t) => (
              <MenuItem key={t} value={t}>{TYPE_LABEL[t]}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ServiceStatus | "")}
          >
            <MenuItem value="">All</MenuItem>
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {/* Table */}
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Slug</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Base URL</TableCell>
                <TableCell>Rate Limit</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : services.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    No services found.
                  </TableCell>
                </TableRow>
              ) : (
                services.map((service) => (
                  <TableRow
                    key={service.id}
                    hover
                    onClick={() => openViewDialog(service)}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell sx={{ fontWeight: 500 }}>{service.name}</TableCell>
                    <TableCell>{service.slug}</TableCell>
                    <TableCell>
                      <Chip label={TYPE_LABEL[service.type]} size="small" />
                    </TableCell>
                    <TableCell>{service.baseUrl}</TableCell>
                    <TableCell>{formatRateLimit(service.rateLimitConfig)}</TableCell>
                    <TableCell>
                      <Chip
                        label={service.status}
                        color={service.status === "ACTIVE" ? "success" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        title="View packages"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(
                            `/company/${companyId}/environments/${environmentId}/services/${service.id}/packages`,
                          );
                        }}
                      >
                        <Inventory2Icon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          openViewDialog(service);
                        }}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                      {canManage && (
                        <>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(service);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(service);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* View Dialog */}
      <Dialog open={viewingService !== null} onClose={closeViewDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{viewingService?.name}</DialogTitle>
        <DialogContent>
          {viewingService && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Slug</Typography>
                <Typography variant="body2">{viewingService.slug}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Type</Typography>
                <Typography variant="body2">{TYPE_LABEL[viewingService.type]}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Base URL</Typography>
                <Typography variant="body2">{viewingService.baseUrl}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Rate Limit</Typography>
                <Typography variant="body2">{formatRateLimit(viewingService.rateLimitConfig)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Status</Typography>
                <Typography variant="body2">{viewingService.status}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Description</Typography>
                <Typography variant="body2">{viewingService.description || "—"}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeViewDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditing ? "Edit Service" : "Add Service"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            {formError && (
              formError.toLowerCase().includes("plan") && formError.toLowerCase().includes("maximum") ? (
                <Alert severity="warning" action={
                  <Button size="small" href="/pricing" target="_blank">View Plans</Button>
                }>
                  <AlertTitle>Plan Limit Reached</AlertTitle>
                  {formError}
                </Alert>
              ) : (
                <Alert severity="error">{formError}</Alert>
              )
            )}
            <TextField
              label="Name *"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              size="small"
              fullWidth
              required
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                label="Type"
                value={form.type}
                onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as ServiceType }))}
              >
                {TYPE_OPTIONS.map((t) => (
                  <MenuItem key={t} value={t}>{TYPE_LABEL[t]}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Base URL *"
              value={form.baseUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, baseUrl: e.target.value }))}
              size="small"
              fullWidth
              required
              placeholder="https://api.example.com"
            />
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Rate Limit Window (ms)"
                value={form.rateLimitWindowMs}
                onChange={(e) => setForm((prev) => ({ ...prev, rateLimitWindowMs: e.target.value }))}
                type="number"
                size="small"
                fullWidth
              />
              <TextField
                label="Rate Limit Max Requests"
                value={form.rateLimitMax}
                onChange={(e) => setForm((prev) => ({ ...prev, rateLimitMax: e.target.value }))}
                type="number"
                size="small"
                fullWidth
              />
            </Box>
            {isEditing && (
              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as ServiceStatus }))}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              size="small"
              fullWidth
              multiline
              minRows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialog} disabled={saving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !form.name.trim() || !form.baseUrl.trim()}
          >
            {saving ? "Saving…" : isEditing ? "Save Changes" : "Add Service"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
