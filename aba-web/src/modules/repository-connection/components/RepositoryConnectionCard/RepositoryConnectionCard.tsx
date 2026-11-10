"use client";
import { useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import GitHubIcon from "@mui/icons-material/GitHub";
import CodeIcon from "@mui/icons-material/Code";
import TuneIcon from "@mui/icons-material/Tune";
import type {
  RepositoryConnection,
  RepositoryConnectionSecretReveal,
  RepositoryProvider,
  RepositoryTriggerMode,
} from "@/modules/repository-connection/types/types";
import {
  createRepositoryConnection,
  rotateRepositoryConnectionSecret,
  updateRepositoryConnectionTriggerSettings,
  deleteRepositoryConnection,
  getRepositoryConnectionErrorMessage,
} from "@/modules/repository-connection/services/repositoryConnectionService";

const PROVIDER_LABEL: Record<RepositoryProvider, string> = {
  GITHUB: "GitHub",
  BITBUCKET: "Bitbucket",
};

const PROVIDERS = Object.keys(PROVIDER_LABEL) as RepositoryProvider[];

// Bitbucket calls the owner a "workspace" and the repo name a "slug".
const OWNER_LABEL: Record<RepositoryProvider, string> = {
  GITHUB: "Owner *",
  BITBUCKET: "Workspace *",
};

const NAME_LABEL: Record<RepositoryProvider, string> = {
  GITHUB: "Repository name *",
  BITBUCKET: "Repository slug *",
};

const TRIGGER_MODE_LABEL: Record<RepositoryTriggerMode, string> = {
  INSTANT: "Instant",
  PUSH_COUNT: "Every N pushes",
  TIME_INTERVAL: "Time interval",
};

function cadenceLabel(connection: RepositoryConnection): string {
  switch (connection.triggerMode) {
    case "INSTANT":
      return "Instant — scans on every push";
    case "PUSH_COUNT":
      return `Every ${connection.pushCountThreshold ?? "?"} pushes (${connection.pendingPushCount}/${connection.pushCountThreshold ?? "?"} so far)`;
    case "TIME_INTERVAL":
      return `Every ${connection.intervalDays ?? "?"} day(s)${connection.pendingPushCount > 0 ? " — pending push queued" : ""}`;
    default:
      return connection.triggerMode;
  }
}

interface RepositoryConnectionCardProps {
  companyId: string;
  environmentId: number;
  serviceId: number;
  accessToken: string;
  connection: RepositoryConnection | null;
  loading: boolean;
  canManage: boolean;
  onChanged: () => void;
}

interface ConnectFormState {
  provider: RepositoryProvider;
  owner: string;
  name: string;
  watchedBranch: string;
}

const EMPTY_FORM: ConnectFormState = {
  provider: "GITHUB",
  owner: "",
  name: "",
  watchedBranch: "main",
};

function copy(text: string) {
  navigator.clipboard?.writeText(text).catch(() => undefined);
}

export default function RepositoryConnectionCard({
  companyId,
  environmentId,
  serviceId,
  accessToken,
  connection,
  loading,
  canManage,
  onChanged,
}: RepositoryConnectionCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ConnectFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [reveal, setReveal] = useState<RepositoryConnectionSecretReveal | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [cadenceDialogOpen, setCadenceDialogOpen] = useState(false);
  const [cadenceMode, setCadenceMode] = useState<RepositoryTriggerMode>("INSTANT");
  const [cadenceCount, setCadenceCount] = useState("5");
  const [cadenceDays, setCadenceDays] = useState("7");
  const [cadenceSaving, setCadenceSaving] = useState(false);
  const [cadenceError, setCadenceError] = useState<string | null>(null);

  const openConnectDialog = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  const closeConnectDialog = () => {
    if (saving) return;
    setDialogOpen(false);
  };

  const handleConnect = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const result = await createRepositoryConnection(
        companyId,
        environmentId,
        serviceId,
        {
          provider: form.provider,
          owner: form.owner,
          name: form.name,
          watchedBranch: form.watchedBranch || "main",
        },
        accessToken,
      );
      setDialogOpen(false);
      setReveal(result);
      onChanged();
    } catch (e) {
      setFormError(getRepositoryConnectionErrorMessage(e, "Failed to connect repository."));
    } finally {
      setSaving(false);
    }
  };

  const handleRotateSecret = async () => {
    setActionError(null);
    try {
      const result = await rotateRepositoryConnectionSecret(
        companyId,
        environmentId,
        serviceId,
        accessToken,
      );
      setReveal(result);
      onChanged();
    } catch (e) {
      setActionError(getRepositoryConnectionErrorMessage(e, "Failed to rotate secret."));
    }
  };

  const handleDisconnect = async () => {
    const providerLabel = connection ? PROVIDER_LABEL[connection.provider] : "GitHub";
    if (!confirm(`Disconnect this repository? ${providerLabel} deliveries to the old webhook URL will start failing.`)) return;
    setActionError(null);
    try {
      await deleteRepositoryConnection(companyId, environmentId, serviceId, accessToken);
      onChanged();
    } catch (e) {
      setActionError(getRepositoryConnectionErrorMessage(e, "Failed to disconnect repository."));
    }
  };

  const openCadenceDialog = () => {
    if (!connection) return;
    setCadenceMode(connection.triggerMode);
    setCadenceCount(String(connection.pushCountThreshold ?? 5));
    setCadenceDays(String(connection.intervalDays ?? 7));
    setCadenceError(null);
    setCadenceDialogOpen(true);
  };

  const closeCadenceDialog = () => {
    if (cadenceSaving) return;
    setCadenceDialogOpen(false);
  };

  const handleSaveCadence = async () => {
    setCadenceSaving(true);
    setCadenceError(null);
    try {
      await updateRepositoryConnectionTriggerSettings(
        companyId,
        environmentId,
        serviceId,
        {
          triggerMode: cadenceMode,
          ...(cadenceMode === "PUSH_COUNT" && { pushCountThreshold: Number(cadenceCount) }),
          ...(cadenceMode === "TIME_INTERVAL" && { intervalDays: Number(cadenceDays) }),
        },
        accessToken,
      );
      setCadenceDialogOpen(false);
      onChanged();
    } catch (e) {
      setCadenceError(getRepositoryConnectionErrorMessage(e, "Failed to update trigger cadence."));
    } finally {
      setCadenceSaving(false);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {connection?.provider === "BITBUCKET" ? <CodeIcon /> : <GitHubIcon />}
          <Typography variant="h6" fontWeight={700}>
            Repository
          </Typography>
        </Box>
        {canManage && !connection && !loading && (
          <Button variant="contained" onClick={openConnectDialog}>
            Connect repository
          </Button>
        )}
      </Box>

      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {loading ? (
        <CircularProgress size={24} />
      ) : !connection ? (
        <Typography variant="body2" color="text.secondary">
          Not connected. Connect a GitHub or Bitbucket repository so a push to the watched
          branch (or, on GitHub, a published release) automatically re-scans this service&apos;s
          registered packages. We never read your repository&apos;s code — only a signed ping
          triggers a re-scan.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography variant="body1" fontWeight={600}>
              {connection.owner}/{connection.name}
            </Typography>
            <Chip label={PROVIDER_LABEL[connection.provider]} size="small" variant="outlined" />
            <Chip label={connection.watchedBranch} size="small" variant="outlined" />
            <Chip
              label={connection.status}
              size="small"
              color={connection.status === "ACTIVE" ? "success" : "default"}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Last ping: {connection.lastPingedAt ? new Date(connection.lastPingedAt).toLocaleString() : "never"}
            {" · "}
            Last triggered scan: {connection.lastTriggeredAt ? new Date(connection.lastTriggeredAt).toLocaleString() : "never"}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              icon={<TuneIcon />}
              label={cadenceLabel(connection)}
              size="small"
              variant="outlined"
              color={connection.triggerMode === "INSTANT" ? "primary" : "default"}
            />
            {canManage && (
              <Button size="small" onClick={openCadenceDialog}>
                Edit cadence
              </Button>
            )}
          </Box>
          {canManage && (
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button size="small" variant="outlined" onClick={handleRotateSecret}>
                Regenerate secret
              </Button>
              <Button size="small" variant="outlined" color="error" onClick={handleDisconnect}>
                Disconnect
              </Button>
            </Box>
          )}
        </Stack>
      )}

      {/* Connect dialog */}
      <Dialog open={dialogOpen} onClose={closeConnectDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Connect repository</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <FormControl size="small" fullWidth>
              <InputLabel id="repository-provider-label">Git provider</InputLabel>
              <Select
                labelId="repository-provider-label"
                label="Git provider"
                value={form.provider}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, provider: e.target.value as RepositoryProvider }))
                }
              >
                {PROVIDERS.map((provider) => (
                  <MenuItem key={provider} value={provider}>{PROVIDER_LABEL[provider]}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label={OWNER_LABEL[form.provider]}
              placeholder="acme-corp"
              value={form.owner}
              onChange={(e) => setForm((prev) => ({ ...prev, owner: e.target.value }))}
              size="small"
              fullWidth
              required
            />
            <TextField
              label={NAME_LABEL[form.provider]}
              placeholder="billing-api"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              size="small"
              fullWidth
              required
            />
            <TextField
              label="Watched branch"
              value={form.watchedBranch}
              onChange={(e) => setForm((prev) => ({ ...prev, watchedBranch: e.target.value }))}
              size="small"
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeConnectDialog} disabled={saving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleConnect}
            disabled={saving || !form.owner.trim() || !form.name.trim()}
          >
            {saving ? "Connecting…" : "Connect"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* One-time secret reveal */}
      <Dialog open={reveal !== null} onClose={() => setReveal(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Repository connected</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This secret is shown only once — copy it now. We store it encrypted and cannot
            show it to you again (you can always regenerate a new one later).
          </Alert>
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {reveal?.connection.provider === "BITBUCKET" ? "Webhook URL" : "Payload URL"}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TextField value={reveal?.webhookUrl ?? ""} size="small" fullWidth InputProps={{ readOnly: true }} />
                <IconButton onClick={() => reveal && copy(reveal.webhookUrl)} aria-label="Copy webhook URL">
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Secret</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TextField value={reveal?.webhookSecret ?? ""} size="small" fullWidth InputProps={{ readOnly: true }} />
                <IconButton onClick={() => reveal && copy(reveal.webhookSecret)} aria-label="Copy webhook secret">
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            {reveal?.connection.provider === "BITBUCKET" ? (
              <Typography variant="body2" color="text.secondary">
                In Bitbucket: repository <strong>Repository settings → Webhooks → Add webhook</strong>{" "}
                → give it a title → paste the URL and Secret above → under Triggers choose{" "}
                <strong>Choose from a full list</strong> and tick <strong>Repository: Push</strong>{" "}
                → <strong>Save</strong>.
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                In GitHub: repo <strong>Settings → Webhooks → Add webhook</strong> → paste the
                Payload URL and Secret above → content type <strong>application/json</strong> →
                select <strong>Pushes</strong> and <strong>Releases</strong> as the trigger events.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" onClick={() => setReveal(null)}>
            I&apos;ve saved this
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit cadence */}
      <Dialog open={cadenceDialogOpen} onClose={closeCadenceDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Edit scan trigger cadence</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            {cadenceError && <Alert severity="error">{cadenceError}</Alert>}
            <FormControl size="small" fullWidth>
              <InputLabel>Mode</InputLabel>
              <Select
                label="Mode"
                value={cadenceMode}
                onChange={(e) => setCadenceMode(e.target.value as RepositoryTriggerMode)}
              >
                {(Object.keys(TRIGGER_MODE_LABEL) as RepositoryTriggerMode[]).map((mode) => (
                  <MenuItem key={mode} value={mode}>{TRIGGER_MODE_LABEL[mode]}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {cadenceMode === "PUSH_COUNT" && (
              <TextField
                label="Scan after this many matching pushes"
                type="number"
                value={cadenceCount}
                onChange={(e) => setCadenceCount(e.target.value)}
                size="small"
                fullWidth
                inputProps={{ min: 1 }}
              />
            )}
            {cadenceMode === "TIME_INTERVAL" && (
              <TextField
                label="Days between scans"
                type="number"
                value={cadenceDays}
                onChange={(e) => setCadenceDays(e.target.value)}
                size="small"
                fullWidth
                inputProps={{ min: 1 }}
                helperText="Only scans if at least one matching push arrived since the last scan."
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeCadenceDialog} disabled={cadenceSaving}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveCadence} disabled={cadenceSaving}>
            {cadenceSaving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
