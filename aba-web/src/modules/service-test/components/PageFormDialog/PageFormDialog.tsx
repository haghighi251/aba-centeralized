"use client";
import React, { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import {
  createTestPage,
  getTestErrorMessage,
  updateTestPage,
} from "@/modules/service-test/services/testService";
import {
  HTTP_METHODS,
  PAGE_TYPES,
  type TestAuthKind,
  type TestPage,
  type TestPageType,
} from "@/modules/service-test/types/types";

const AUTH_KINDS: TestAuthKind[] = [
  "NONE",
  "BEARER_TOKEN",
  "API_KEY_HEADER",
  "BASIC",
];

export interface PageFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  companyId: string;
  environmentId: number;
  serviceId: number;
  accessToken: string;
  target: TestPage | null;
}

export default function PageFormDialog({
  open,
  onClose,
  onSaved,
  companyId,
  environmentId,
  serviceId,
  accessToken,
  target,
}: PageFormDialogProps) {
  const isEdit = Boolean(target);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pageType, setPageType] = useState<TestPageType>("CUSTOM");
  const [path, setPath] = useState("");
  const [absoluteUrl, setAbsoluteUrl] = useState("");
  const [method, setMethod] = useState("GET");
  const [authKind, setAuthKind] = useState<TestAuthKind>("NONE");
  const [authSecret, setAuthSecret] = useState("");
  const [tokenRequired, setTokenRequired] = useState(false);
  const [expectedStatusWithoutAuth, setExpectedStatusWithoutAuth] =
    useState("");
  const [requestValiditySeconds, setRequestValiditySeconds] = useState("");
  const [customHeaders, setCustomHeaders] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setName(target?.name ?? "");
    setDescription(target?.description ?? "");
    setPageType(target?.pageType ?? "CUSTOM");
    setPath(target?.path ?? "");
    setAbsoluteUrl(target?.absoluteUrl ?? "");
    setMethod(target?.method ?? "GET");
    setAuthKind(target?.authKind ?? "NONE");
    setAuthSecret("");
    const ac = (target?.accessConfig ?? {}) as Record<string, unknown>;
    setTokenRequired(Boolean(ac.tokenRequired));
    setExpectedStatusWithoutAuth(
      ac.expectedStatusWithoutAuth != null
        ? String(ac.expectedStatusWithoutAuth)
        : "",
    );
    setRequestValiditySeconds(
      ac.requestValiditySeconds != null
        ? String(ac.requestValiditySeconds)
        : "",
    );
    setCustomHeaders(
      ac.customHeaders ? JSON.stringify(ac.customHeaders, null, 2) : "",
    );
  }, [open, target]);

  const handleSave = async () => {
    setError(null);

    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    if (!path.trim() && !absoluteUrl.trim()) {
      setError("Provide either a path or an absolute URL.");
      return;
    }
    if (authKind !== "NONE" && !isEdit && !authSecret) {
      setError("An auth secret is required for the selected auth type.");
      return;
    }

    const accessConfig: Record<string, unknown> = {};
    if (tokenRequired) accessConfig.tokenRequired = true;
    if (expectedStatusWithoutAuth.trim()) {
      const n = Number(expectedStatusWithoutAuth);
      if (Number.isNaN(n)) {
        setError("Expected status without auth must be a number.");
        return;
      }
      accessConfig.expectedStatusWithoutAuth = n;
    }
    if (requestValiditySeconds.trim()) {
      const n = Number(requestValiditySeconds);
      if (Number.isNaN(n) || n <= 0) {
        setError("Request validity must be a positive number of seconds.");
        return;
      }
      accessConfig.requestValiditySeconds = n;
    }
    if (customHeaders.trim()) {
      try {
        accessConfig.customHeaders = JSON.parse(customHeaders);
      } catch {
        setError("Custom headers must be valid JSON (an object of strings).");
        return;
      }
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      pageType,
      path: path.trim() || undefined,
      absoluteUrl: absoluteUrl.trim() || undefined,
      method,
      authKind,
      authSecret: authSecret || undefined,
      accessConfig:
        Object.keys(accessConfig).length > 0 ? accessConfig : undefined,
    };

    setSaving(true);
    try {
      if (isEdit && target) {
        await updateTestPage(
          companyId,
          environmentId,
          serviceId,
          target.id,
          payload,
          accessToken,
        );
      } else {
        await createTestPage(
          companyId,
          environmentId,
          serviceId,
          payload,
          accessToken,
        );
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(getTestErrorMessage(e, "Failed to save the page."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? "Edit page" : "Add page"}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
            />
            <TextField
              select
              label="Page type"
              value={pageType}
              onChange={(e) => setPageType(e.target.value as TestPageType)}
              sx={{ minWidth: 170 }}
            >
              {PAGE_TYPES.map((p) => (
                <MenuItem key={p} value={p}>
                  {p}
                </MenuItem>
              ))}
            </TextField>
          </Box>
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
          />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              select
              label="Method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              sx={{ minWidth: 120 }}
            >
              {HTTP_METHODS.map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Path (relative to service base URL)"
              placeholder="/api/auth/login"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              fullWidth
            />
          </Box>
          <TextField
            label="Absolute URL (optional, overrides path)"
            placeholder="https://api.example.com/health"
            value={absoluteUrl}
            onChange={(e) => setAbsoluteUrl(e.target.value)}
            fullWidth
          />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              select
              label="Auth type"
              value={authKind}
              onChange={(e) => setAuthKind(e.target.value as TestAuthKind)}
              sx={{ minWidth: 180 }}
            >
              {AUTH_KINDS.map((k) => (
                <MenuItem key={k} value={k}>
                  {k}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={
                isEdit && target?.hasAuthSecret
                  ? "Auth secret (leave blank to keep)"
                  : "Auth secret"
              }
              type="password"
              value={authSecret}
              onChange={(e) => setAuthSecret(e.target.value)}
              disabled={authKind === "NONE"}
              fullWidth
            />
          </Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={tokenRequired}
                onChange={(e) => setTokenRequired(e.target.checked)}
              />
            }
            label="This page requires an auth token to access normally"
          />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Expected status without auth"
              placeholder="401"
              value={expectedStatusWithoutAuth}
              onChange={(e) => setExpectedStatusWithoutAuth(e.target.value)}
              fullWidth
            />
            <TextField
              label="Request validity (seconds)"
              placeholder="e.g. 900 for a 15-min token"
              value={requestValiditySeconds}
              onChange={(e) => setRequestValiditySeconds(e.target.value)}
              fullWidth
            />
          </Box>
          <TextField
            label="Custom headers (JSON object)"
            placeholder={'{\n  "X-Env": "staging"\n}'}
            value={customHeaders}
            onChange={(e) => setCustomHeaders(e.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
