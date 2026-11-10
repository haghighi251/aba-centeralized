"use client";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
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
import CircularProgress from "@mui/material/CircularProgress";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import {
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamErrorMessage,
  Team,
  TeamStatus,
  TeamFilter,
  CreateTeamPayload,
} from "@/contexts/team/services/teamService";

const STATUS_OPTIONS: TeamStatus[] = ["ACTIVE", "ARCHIVED"];

/**
 * Roles that are allowed to add, edit, or delete teams.
 * BUSINESS_MEMBER is intentionally excluded — they can only view.
 */
const MANAGER_ROLES = ["BUSINESS_OWNER", "BUSINESS_ADMIN"];

interface TeamFormState {
  name: string;
  description: string;
  status: TeamStatus;
}

const EMPTY_FORM: TeamFormState = {
  name: "",
  description: "",
  status: "ACTIVE",
};

export default function TeamsPage() {
  const { data: session } = useSession();
  const params = useParams();
  const companyId = params.id as string;

  const user = session?.user as any;
  const accessToken = user?.tokens?.accessToken ?? "";
  const role = (user?.role ?? "") as string;
  const canManage = MANAGER_ROLES.includes(role);

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TeamStatus | "">("");

  // Add/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [form, setForm] = useState<TeamFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isEditing = editingTeam !== null;

  const load = useCallback(
    async (signal: { cancelled: boolean }) => {
      if (!accessToken) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const filter: TeamFilter = {
          search: search || undefined,
          status: statusFilter || undefined,
        };
        const result = await getTeams(companyId, filter, accessToken);
        if (signal.cancelled) return;
        setTeams(result.data);
      } catch (e) {
        if (signal.cancelled) return;
        setError(getTeamErrorMessage(e, "Failed to load teams."));
      } finally {
        if (!signal.cancelled) setLoading(false);
      }
    },
    [companyId, accessToken, search, statusFilter],
  );

  useEffect(() => {
    const signal = { cancelled: false };
    load(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [load]);

  const openCreateDialog = () => {
    setEditingTeam(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (team: Team) => {
    setEditingTeam(team);
    setForm({
      name: team.name,
      description: team.description ?? "",
      status: team.status,
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
      if (isEditing) {
        const updated = await updateTeam(
          companyId,
          editingTeam.id,
          {
            name: form.name,
            description: form.description || null,
            status: form.status,
          },
          accessToken,
        );
        setTeams((prev) =>
          prev.map((team) => (team.id === updated.id ? updated : team)),
        );
      } else {
        const payload: CreateTeamPayload = {
          name: form.name,
          description: form.description || null,
        };
        const created = await createTeam(companyId, payload, accessToken);
        setTeams((prev) => [...prev, created]);
      }
      setDialogOpen(false);
    } catch (e) {
      setFormError(
        getTeamErrorMessage(
          e,
          isEditing ? "Failed to update team." : "Failed to create team.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (team: Team) => {
    if (!confirm(`Delete team "${team.name}"? This will also delete all of its environments.`)) return;
    setError(null);
    try {
      await deleteTeam(companyId, team.id, accessToken);
      setTeams((prev) => prev.filter((t) => t.id !== team.id));
    } catch (e) {
      setError(getTeamErrorMessage(e, "Failed to delete team."));
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Teams
        </Typography>
        {canManage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
            Add Team
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
          <InputLabel>Status</InputLabel>
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TeamStatus | "")}
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
                <TableCell>Description</TableCell>
                <TableCell>Status</TableCell>
                {canManage && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 5 : 4} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : teams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 5 : 4} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    No teams found.
                  </TableCell>
                </TableRow>
              ) : (
                teams.map((team) => (
                  <TableRow key={team.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{team.name}</TableCell>
                    <TableCell>{team.slug}</TableCell>
                    <TableCell>{team.description || "—"}</TableCell>
                    <TableCell>
                      <Chip
                        label={team.status}
                        color={team.status === "ACTIVE" ? "success" : "default"}
                        size="small"
                      />
                    </TableCell>
                    {canManage && (
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => openEditDialog(team)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(team)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditing ? "Edit Team" : "Add Team"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              label="Name *"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              size="small"
              fullWidth
              required
            />
            {isEditing && (
              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as TeamStatus }))}
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
            disabled={saving || !form.name.trim()}
          >
            {saving ? "Saving…" : isEditing ? "Save Changes" : "Add Team"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
