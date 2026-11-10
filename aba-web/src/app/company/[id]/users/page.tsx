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
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Checkbox from "@mui/material/Checkbox";
import ListItemText from "@mui/material/ListItemText";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import {
  getCompanyUsers,
  addCompanyUser,
  updateCompanyUser,
  removeCompanyUser,
  CompanyUser,
} from "@/contexts/company/services/companyDashboardService";
import { getTeams, Team } from "@/contexts/team/services/teamService";

const ROLE_COLOR: Record<string, "primary" | "warning" | "default"> = {
  BUSINESS_OWNER: "primary",
  BUSINESS_ADMIN: "warning",
  BUSINESS_MEMBER: "default",
};

const ROLE_LABEL: Record<string, string> = {
  BUSINESS_OWNER: "Owner",
  BUSINESS_ADMIN: "Admin",
  BUSINESS_MEMBER: "Member",
};

/**
 * Roles that are allowed to add, edit, or delete company users.
 * BUSINESS_MEMBER is intentionally excluded — they can only view the table.
 */
const MANAGER_ROLES = ["BUSINESS_OWNER", "BUSINESS_ADMIN"];

export default function UsersPage() {
  const { data: session } = useSession();
  const params = useParams();
  const id = params.id as string;

  const user        = session?.user as any;
  const token       = user?.tokens?.accessToken ?? "";
  const callerRole  = user?.role as string ?? "";
  const callerId    = user?.id as string ?? "";
  const isOwner     = callerRole === "BUSINESS_OWNER";
  const canManage   = MANAGER_ROLES.includes(callerRole);
  const columnCount = canManage ? 7 : 6;

  const [users,   setUsers]   = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const [teams, setTeams] = useState<Team[]>([]);

  // Add-user dialog
  const [open,     setOpen]     = useState(false);
  const [formEmail,    setFormEmail]    = useState("");
  const [formFirst,    setFormFirst]    = useState("");
  const [formLast,     setFormLast]     = useState("");
  const [formRole,     setFormRole]     = useState<"BUSINESS_ADMIN" | "BUSINESS_MEMBER">("BUSINESS_MEMBER");
  const [formPassword, setFormPassword] = useState("");
  const [formTeamIds,  setFormTeamIds]  = useState<number[]>([]);
  const [adding,   setAdding]   = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit-user dialog
  const [editUser,     setEditUser]     = useState<CompanyUser | null>(null);
  const [editRole,     setEditRole]     = useState<"BUSINESS_ADMIN" | "BUSINESS_MEMBER">("BUSINESS_MEMBER");
  const [editTeamIds,  setEditTeamIds]  = useState<number[]>([]);
  const [saving,   setSaving]   = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const isEditOpen = editUser !== null;

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setUsers(await getCompanyUsers(id, token));
    } catch {
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!token || !canManage) return;
    getTeams(id, {}, token)
      .then((result) => setTeams(result.data))
      .catch(() => setTeams([]));
  }, [id, token, canManage]);

  const handleDelete = async (userId: number) => {
    if (!confirm("Remove this user from the company?")) return;
    try {
      await removeCompanyUser(id, userId, token);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Failed to remove user.");
    }
  };

  const handleAdd = async () => {
    setAdding(true);
    setAddError(null);
    try {
      const created = await addCompanyUser(id, {
        email: formEmail,
        firstName: formFirst || undefined,
        lastName: formLast || undefined,
        role: formRole,
        password: formPassword,
        teamIds: formTeamIds,
      }, token);
      setUsers((prev) => [...prev, created]);
      setOpen(false);
      setFormEmail(""); setFormFirst(""); setFormLast("");
      setFormPassword(""); setFormRole("BUSINESS_MEMBER"); setFormTeamIds([]);
    } catch (e: any) {
      setAddError(e?.response?.data?.error ?? "Failed to add user.");
    } finally {
      setAdding(false);
    }
  };

  const openEditDialog = (u: CompanyUser) => {
    setEditUser(u);
    setEditRole(u.role === "BUSINESS_ADMIN" ? "BUSINESS_ADMIN" : "BUSINESS_MEMBER");
    setEditTeamIds(u.teams.map((t) => t.id));
    setEditError(null);
  };

  const closeEditDialog = () => {
    if (saving) return;
    setEditUser(null);
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    setSaving(true);
    setEditError(null);
    try {
      // The owner role is never reassignable through this dialog — omit
      // `role` entirely for an owner target so only name/teams are updated.
      const isOwnerTarget = editUser.role === "BUSINESS_OWNER";
      const updated = await updateCompanyUser(id, editUser.id, {
        ...(!isOwnerTarget && { role: editRole }),
        teamIds: editTeamIds,
      }, token);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditUser(null);
    } catch (e: any) {
      setEditError(e?.response?.data?.error ?? "Failed to update user.");
    } finally {
      setSaving(false);
    }
  };

  const canDelete = (u: CompanyUser) => {
    if (u.id.toString() === callerId) return false;
    if (isOwner) return u.role !== "BUSINESS_OWNER";
    // BUSINESS_ADMIN can only remove BUSINESS_MEMBER
    return u.role === "BUSINESS_MEMBER";
  };

  // Mirrors the backend's updateUser restriction: BUSINESS_ADMIN cannot
  // modify admin/owner users. The owner can edit an owner row (e.g.
  // themselves) for name/teams, but the dialog never exposes a way to
  // change the role away from BUSINESS_OWNER (see handleEditSave).
  const canEdit = (u: CompanyUser) => {
    if (u.role === "BUSINESS_OWNER") return isOwner;
    return isOwner ? true : u.role === "BUSINESS_MEMBER";
  };

  const renderTeamMenuItems = (selectedIds: number[]) =>
    teams.map((team) => (
      <MenuItem key={team.id} value={team.id}>
        <Checkbox checked={selectedIds.includes(team.id)} size="small" />
        <ListItemText primary={team.name} />
      </MenuItem>
    ));

  const teamNames = (teamIds: number[]) =>
    teams.filter((t) => teamIds.includes(t.id)).map((t) => t.name).join(", ");

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Users</Typography>
        {canManage && (
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => setOpen(true)}
          >
            Add User
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Teams</TableCell>
                <TableCell>Joined</TableCell>
                {canManage && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columnCount} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columnCount} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell>
                      {[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={ROLE_LABEL[u.role] ?? u.role}
                        color={ROLE_COLOR[u.role] ?? "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={u.status}
                        color={u.status === "ACTIVE" ? "success" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {u.teams.length === 0 ? (
                        "—"
                      ) : (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {u.teams.map((t) => (
                            <Chip key={t.id} label={t.name} size="small" variant="outlined" />
                          ))}
                        </Stack>
                      )}
                    </TableCell>
                    <TableCell>{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                    {canManage && (
                      <TableCell align="right">
                        {canEdit(u) && (
                          <IconButton
                            size="small"
                            onClick={() => openEditDialog(u)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        )}
                        {canDelete(u) && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(u.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add User Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            {addError && <Alert severity="error">{addError}</Alert>}
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="First Name"
                value={formFirst}
                onChange={(e) => setFormFirst(e.target.value)}
                size="small" fullWidth
              />
              <TextField
                label="Last Name"
                value={formLast}
                onChange={(e) => setFormLast(e.target.value)}
                size="small" fullWidth
              />
            </Box>
            <TextField
              label="Email *"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              type="email" size="small" fullWidth required
            />
            <TextField
              label="Initial Password *"
              value={formPassword}
              onChange={(e) => setFormPassword(e.target.value)}
              type="password" size="small" fullWidth required
              helperText="The user can reset it via Forgot Password."
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Role *</InputLabel>
              <Select
                label="Role *"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as any)}
              >
                {isOwner && (
                  <MenuItem value="BUSINESS_ADMIN">Admin</MenuItem>
                )}
                <MenuItem value="BUSINESS_MEMBER">Member</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Teams</InputLabel>
              <Select<number[]>
                multiple
                label="Teams"
                value={formTeamIds}
                onChange={(e: SelectChangeEvent<number[]>) =>
                  setFormTeamIds(
                    typeof e.target.value === "string" ? [] : e.target.value,
                  )
                }
                renderValue={(selected) => teamNames(selected) || "None"}
              >
                {renderTeamMenuItems(formTeamIds)}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={adding}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={adding || !formEmail || !formPassword}
          >
            {adding ? "Adding…" : "Add User"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onClose={closeEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            {editError && <Alert severity="error">{editError}</Alert>}
            {editUser && (
              <TextField
                label="Email"
                value={editUser.email}
                size="small" fullWidth disabled
              />
            )}
            {editUser?.role === "BUSINESS_OWNER" ? (
              <TextField
                label="Role"
                value="Owner"
                size="small" fullWidth disabled
                helperText="The owner role can't be changed here."
              />
            ) : (
              <FormControl size="small" fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  label="Role"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                >
                  {isOwner && (
                    <MenuItem value="BUSINESS_ADMIN">Admin</MenuItem>
                  )}
                  <MenuItem value="BUSINESS_MEMBER">Member</MenuItem>
                </Select>
              </FormControl>
            )}
            <FormControl size="small" fullWidth>
              <InputLabel>Teams</InputLabel>
              <Select<number[]>
                multiple
                label="Teams"
                value={editTeamIds}
                onChange={(e: SelectChangeEvent<number[]>) =>
                  setEditTeamIds(
                    typeof e.target.value === "string" ? [] : e.target.value,
                  )
                }
                renderValue={(selected) => teamNames(selected) || "None"}
              >
                {renderTeamMenuItems(editTeamIds)}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeEditDialog} disabled={saving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleEditSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
