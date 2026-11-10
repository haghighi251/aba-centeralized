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
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
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
import {
  getEnvironments,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
  getEnvironmentErrorMessage,
  Environment,
  EnvironmentType,
  EnvironmentStatus,
  EnvironmentFilter,
  CreateEnvironmentPayload,
} from "@/contexts/environment/services/environmentService";
import { getTeams, Team } from "@/contexts/team/services/teamService";

const STATUS_OPTIONS: EnvironmentStatus[] = ["ACTIVE", "ARCHIVED"];

const TYPE_OPTIONS: EnvironmentType[] = [
  "DEVELOPMENT",
  "TESTING",
  "STAGING",
  "PRODUCTION",
  "PREVIEW",
  "DISASTER",
  "DEMO",
  "SUPPORT",
  "EXPERIMENTAL",
  "CUSTOM",
];

const TYPE_LABEL: Record<EnvironmentType, string> = {
  DEVELOPMENT: "Development",
  TESTING: "Testing",
  STAGING: "Staging",
  PRODUCTION: "Production",
  PREVIEW: "Preview",
  DISASTER: "Disaster Recovery",
  DEMO: "Demo",
  SUPPORT: "Support",
  EXPERIMENTAL: "Experimental",
  CUSTOM: "Custom",
};

const TYPE_COLOR: Record<EnvironmentType, "default" | "info" | "warning" | "error" | "success"> = {
  DEVELOPMENT: "info",
  TESTING: "warning",
  STAGING: "warning",
  PRODUCTION: "error",
  PREVIEW: "info",
  DISASTER: "error",
  DEMO: "success",
  SUPPORT: "default",
  EXPERIMENTAL: "warning",
  CUSTOM: "default",
};

/**
 * Roles that are allowed to add, edit, or delete environments.
 * BUSINESS_MEMBER is intentionally excluded — they can only view.
 */
const MANAGER_ROLES = ["BUSINESS_OWNER", "BUSINESS_ADMIN"];

interface EnvironmentFormState {
  teamId: string;
  name: string;
  type: EnvironmentType;
  isProduction: boolean;
  order: string;
  description: string;
  status: EnvironmentStatus;
}

const EMPTY_FORM: EnvironmentFormState = {
  teamId: "",
  name: "",
  type: "CUSTOM",
  isProduction: false,
  order: "",
  description: "",
  status: "ACTIVE",
};

export default function EnvironmentsPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const user = session?.user as any;
  const accessToken = user?.tokens?.accessToken ?? "";
  const role = (user?.role ?? "") as string;
  const canManage = MANAGER_ROLES.includes(role);

  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState<number | "">("");
  const [typeFilter, setTypeFilter] = useState<EnvironmentType | "">("");
  const [statusFilter, setStatusFilter] = useState<EnvironmentStatus | "">("");

  // Add/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEnvironment, setEditingEnvironment] = useState<Environment | null>(null);
  const [form, setForm] = useState<EnvironmentFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isEditing = editingEnvironment !== null;

  const load = useCallback(
    async (signal: { cancelled: boolean }) => {
      if (!accessToken) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const filter: EnvironmentFilter = {
          search: search || undefined,
          teamId: teamFilter || undefined,
          type: typeFilter || undefined,
          status: statusFilter || undefined,
        };
        const [result, teamsResult] = await Promise.all([
          getEnvironments(companyId, filter, accessToken),
          getTeams(companyId, {}, accessToken),
        ]);
        if (signal.cancelled) return;
        setEnvironments(result.data);
        setTeams(teamsResult.data);
      } catch (e) {
        if (signal.cancelled) return;
        setError(getEnvironmentErrorMessage(e, "Failed to load environments."));
      } finally {
        if (!signal.cancelled) setLoading(false);
      }
    },
    [companyId, accessToken, search, teamFilter, typeFilter, statusFilter],
  );

  useEffect(() => {
    const signal = { cancelled: false };
    load(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [load]);

  /** Looks up a team's display name by id for the "Team" table column. */
  const teamName = (teamId: number) => teams.find((t) => t.id === teamId)?.name ?? "—";

  /** Opens the environment detail page where services can be viewed/managed. */
  const openEnvironment = (environment: Environment) => {
    router.push(`/company/${companyId}/environments/${environment.id}`);
  };

  const openCreateDialog = () => {
    setEditingEnvironment(null);
    setForm({ ...EMPTY_FORM, teamId: teamFilter ? String(teamFilter) : "" });
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (environment: Environment) => {
    setEditingEnvironment(environment);
    setForm({
      teamId: String(environment.teamId),
      name: environment.name,
      type: environment.type,
      isProduction: environment.isProduction,
      order: String(environment.order),
      description: environment.description ?? "",
      status: environment.status,
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
      const order = form.order.trim() === "" ? undefined : Number(form.order);
      const teamId = Number(form.teamId);

      if (isEditing) {
        const updated = await updateEnvironment(
          companyId,
          editingEnvironment.id,
          {
            teamId,
            name: form.name,
            type: form.type,
            isProduction: form.isProduction,
            order,
            description: form.description || null,
            status: form.status,
          },
          accessToken,
        );
        setEnvironments((prev) =>
          prev.map((env) => (env.id === updated.id ? updated : env)),
        );
      } else {
        const payload: CreateEnvironmentPayload = {
          teamId,
          name: form.name,
          type: form.type,
          isProduction: form.isProduction,
          order,
          description: form.description || null,
        };
        const created = await createEnvironment(companyId, payload, accessToken);
        setEnvironments((prev) => [...prev, created]);
      }
      setDialogOpen(false);
    } catch (e) {
      const msg = getEnvironmentErrorMessage(
        e,
        isEditing ? "Failed to update environment." : "Failed to create environment.",
      );
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const isPlanLimitError = (msg: string | null) =>
    msg !== null && msg.toLowerCase().includes("plan") && msg.toLowerCase().includes("maximum");

  const handleDelete = async (environment: Environment) => {
    if (!confirm(`Delete environment "${environment.name}"?`)) return;
    setError(null);
    try {
      await deleteEnvironment(companyId, environment.id, accessToken);
      setEnvironments((prev) => prev.filter((env) => env.id !== environment.id));
    } catch (e) {
      setError(getEnvironmentErrorMessage(e, "Failed to delete environment."));
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Environments
        </Typography>
        {canManage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
            Add Environment
          </Button>
        )}
      </Box>

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
          <InputLabel>Team</InputLabel>
          <Select
            label="Team"
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value as number | "")}
          >
            <MenuItem value="">All</MenuItem>
            {teams.map((t) => (
              <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Type</InputLabel>
          <Select
            label="Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as EnvironmentType | "")}
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
            onChange={(e) => setStatusFilter(e.target.value as EnvironmentStatus | "")}
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
                <TableCell>Order</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Slug</TableCell>
                <TableCell>Team</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Production</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : environments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    No environments found.
                  </TableCell>
                </TableRow>
              ) : (
                environments.map((environment) => (
                  <TableRow
                    key={environment.id}
                    hover
                    onClick={() => openEnvironment(environment)}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell>{environment.order}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{environment.name}</TableCell>
                    <TableCell>{environment.slug}</TableCell>
                    <TableCell>{teamName(environment.teamId)}</TableCell>
                    <TableCell>
                      <Chip
                        label={TYPE_LABEL[environment.type]}
                        color={TYPE_COLOR[environment.type]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {environment.isProduction ? (
                        <Chip label="Production" color="error" size="small" />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={environment.status}
                        color={environment.status === "ACTIVE" ? "success" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEnvironment(environment);
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
                              openEditDialog(environment);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(environment);
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditing ? "Edit Environment" : "Add Environment"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            {formError && (
              isPlanLimitError(formError) ? (
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
            {teams.length === 0 && (
              <Alert severity="warning">
                You need to create a team before you can add an environment.
              </Alert>
            )}
            <FormControl size="small" fullWidth required>
              <InputLabel>Team *</InputLabel>
              <Select
                label="Team *"
                value={form.teamId}
                onChange={(e) => setForm((prev) => ({ ...prev, teamId: e.target.value as string }))}
              >
                {teams.map((t) => (
                  <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Name *"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              size="small"
              fullWidth
              required
            />
            <Box sx={{ display: "flex", gap: 2 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  label="Type"
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as EnvironmentType }))}
                >
                  {TYPE_OPTIONS.map((t) => (
                    <MenuItem key={t} value={t}>{TYPE_LABEL[t]}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Order"
                value={form.order}
                onChange={(e) => setForm((prev) => ({ ...prev, order: e.target.value }))}
                type="number"
                size="small"
                fullWidth
                helperText="Pipeline order (1=Dev, 2=Test, 3=Staging, 4=Prod). Auto-assigned if left blank."
              />
            </Box>
            {isEditing && (
              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as EnvironmentStatus }))}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <FormControlLabel
              control={
                <Switch
                  checked={form.isProduction}
                  onChange={(e) => setForm((prev) => ({ ...prev, isProduction: e.target.checked }))}
                />
              }
              label="Production environment (safety flag)"
            />
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
            disabled={saving || !form.name.trim() || !form.teamId}
          >
            {saving ? "Saving…" : isEditing ? "Save Changes" : "Add Environment"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
