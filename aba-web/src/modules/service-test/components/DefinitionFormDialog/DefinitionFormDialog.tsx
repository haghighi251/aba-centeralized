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
import Switch from "@mui/material/Switch";
import Checkbox from "@mui/material/Checkbox";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Paper from "@mui/material/Paper";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import {
  aiImproveTest,
  createTestDefinition,
  getTestErrorMessage,
  updateTestDefinition,
} from "@/modules/service-test/services/testService";
import {
  FORM_FIELD_TYPES,
  HTTP_METHODS,
  SCENARIO_CONDITIONS,
  type FormFieldType,
  type RequestContentType,
  type ScenarioCondition,
  type SimulatedFormField,
  type TestDefinition,
  type TestPage,
  type TestType,
} from "@/modules/service-test/types/types";

const TYPE_OPTIONS: { value: TestType; label: string; hint: string }[] = [
  { value: "CUSTOM_API", label: "Custom API", hint: "Runs now (HTTP engine)" },
  { value: "GLOBAL_SECURITY", label: "Global security", hint: "Playwright — later phase" },
  { value: "BROWSER", label: "Browser", hint: "Playwright — later phase" },
];
const CONTENT_TYPES: RequestContentType[] = ["json", "form-urlencoded", "multipart"];

interface KV {
  key: string;
  value: string;
}
interface ScenarioRow {
  name: string;
  condition: ScenarioCondition;
  tokenOverride: string;
  headerOverrides: string; // JSON
  expectStatus: string; // e.g. "200" or "401,403"
  bodyContains: string; // newline-separated
}

export interface DefinitionFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  companyId: string;
  environmentId: number;
  serviceId: number;
  targetId: number;
  page: TestPage | null;
  accessToken: string;
  definition: TestDefinition | null;
  aiEnabled?: boolean;
}

const toKvArray = (rec?: Record<string, unknown> | null): KV[] =>
  rec ? Object.entries(rec).map(([key, value]) => ({ key, value: String(value) })) : [];
const toRecord = (rows: KV[]): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const r of rows) if (r.key.trim()) out[r.key.trim()] = r.value;
  return out;
};
const parseStatuses = (raw: string): number | number[] | undefined => {
  const nums = raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => !Number.isNaN(n));
  if (nums.length === 0) return undefined;
  return nums.length === 1 ? nums[0] : nums;
};

export default function DefinitionFormDialog({
  open,
  onClose,
  onSaved,
  companyId,
  environmentId,
  serviceId,
  targetId,
  page,
  accessToken,
  definition,
  aiEnabled = false,
}: DefinitionFormDialogProps) {
  const isEdit = Boolean(definition);

  const [name, setName] = useState("");
  const [type, setType] = useState<TestType>("CUSTOM_API");
  const [templateKey, setTemplateKey] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [method, setMethod] = useState("POST");
  const [contentType, setContentType] = useState<RequestContentType>("form-urlencoded");
  const [timeoutSeconds, setTimeoutSeconds] = useState("");
  const [formName, setFormName] = useState("");
  const [fields, setFields] = useState<SimulatedFormField[]>([]);
  const [headers, setHeaders] = useState<KV[]>([]);
  const [query, setQuery] = useState<KV[]>([]);
  const [rawBody, setRawBody] = useState("");
  const [scenarios, setScenarios] = useState<ScenarioRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [improving, setImproving] = useState(false);
  const [improveRationale, setImproveRationale] = useState<string | null>(null);

  // Populate the request/scenario form fields from a config object (shared by
  // the initial load and the "Improve with AI" apply).
  const applyConfig = (cfg: Record<string, any>) => {
    setMethod((cfg.method as string) ?? "POST");
    setContentType((cfg.contentType as RequestContentType) ?? "form-urlencoded");
    setTimeoutSeconds(cfg.timeoutSeconds != null ? String(cfg.timeoutSeconds) : "");
    setFormName(cfg.form?.name ?? "");
    setFields(cfg.form?.fields?.length ? cfg.form.fields : []);
    setHeaders(toKvArray(cfg.headers));
    setQuery(toKvArray(cfg.query));
    setRawBody(
      cfg.body != null
        ? typeof cfg.body === "string"
          ? cfg.body
          : JSON.stringify(cfg.body, null, 2)
        : "",
    );
    if (cfg.scenarios?.length) {
      setScenarios(
        cfg.scenarios.map((s: any) => ({
          name: s.name ?? "",
          condition: (s.condition as ScenarioCondition) ?? "VALID_TOKEN",
          tokenOverride: s.tokenOverride ?? "",
          headerOverrides: s.headerOverrides ? JSON.stringify(s.headerOverrides) : "",
          expectStatus: s.expect?.status != null ? ([] as any).concat(s.expect.status).join(",") : "",
          bodyContains: Array.isArray(s.expect?.bodyContains) ? s.expect.bodyContains.join("\n") : "",
        })),
      );
    }
  };

  const handleImprove = async () => {
    if (!definition || !page) return;
    setImproving(true);
    setError(null);
    setImproveRationale(null);
    try {
      const res = await aiImproveTest(
        companyId,
        environmentId,
        serviceId,
        targetId,
        definition.id,
        {},
        accessToken,
      );
      if (res.improved.name) setName(res.improved.name.slice(0, 120));
      if (res.improved.config) applyConfig(res.improved.config as Record<string, any>);
      setImproveRationale(
        res.rationale ||
          "Applied AI suggestions. Review the request and scenarios below, then Save.",
      );
    } catch (e) {
      setError(getTestErrorMessage(e, "Failed to improve the test."));
    } finally {
      setImproving(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setError(null);
    setImproveRationale(null);
    setName(definition?.name ?? "");
    setType(definition?.type ?? "CUSTOM_API");
    setTemplateKey(definition?.templateKey ?? "");
    setEnabled(definition?.enabled ?? true);

    const cfg = (definition?.config ?? {}) as Record<string, any>;
    setMethod((cfg.method as string) ?? "POST");
    setContentType((cfg.contentType as RequestContentType) ?? "form-urlencoded");
    setTimeoutSeconds(cfg.timeoutSeconds != null ? String(cfg.timeoutSeconds) : "");
    setFormName(cfg.form?.name ?? "");
    setFields(cfg.form?.fields?.length ? cfg.form.fields : []);
    setHeaders(toKvArray(cfg.headers));
    setQuery(toKvArray(cfg.query));
    setRawBody(
      cfg.body != null ? (typeof cfg.body === "string" ? cfg.body : JSON.stringify(cfg.body, null, 2)) : "",
    );

    if (cfg.scenarios?.length) {
      setScenarios(
        cfg.scenarios.map((s: any) => ({
          name: s.name ?? "",
          condition: (s.condition as ScenarioCondition) ?? "VALID_TOKEN",
          tokenOverride: s.tokenOverride ?? "",
          headerOverrides: s.headerOverrides ? JSON.stringify(s.headerOverrides) : "",
          expectStatus: s.expect?.status != null ? [].concat(s.expect.status).join(",") : "",
          bodyContains: Array.isArray(s.expect?.bodyContains) ? s.expect.bodyContains.join("\n") : "",
        })),
      );
    } else if (!definition) {
      // New test: prefill a sensible matrix from the page's posture.
      const rows: ScenarioRow[] = [
        {
          name: "",
          condition: "VALID_TOKEN",
          tokenOverride: "",
          headerOverrides: "",
          expectStatus: "200",
          bodyContains: "",
        },
      ];
      const ac = (page?.accessConfig ?? {}) as Record<string, any>;
      if (page?.authKind && page.authKind !== "NONE") {
        rows.push({
          name: "",
          condition: "NO_TOKEN",
          tokenOverride: "",
          headerOverrides: "",
          expectStatus: String(ac.expectedStatusWithoutAuth ?? 401),
          bodyContains: "",
        });
      }
      setScenarios(rows);
    } else {
      setScenarios([]);
    }
  }, [open, definition, page]);

  const addScenario = () =>
    setScenarios((p) => [
      ...p,
      { name: "", condition: "VALID_TOKEN", tokenOverride: "", headerOverrides: "", expectStatus: "200", bodyContains: "" },
    ]);
  const updateScenario = (i: number, patch: Partial<ScenarioRow>) =>
    setScenarios((p) => p.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const removeScenario = (i: number) => setScenarios((p) => p.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setError(null);
    if (name.trim().length < 2) return setError("Name must be at least 2 characters.");
    if (type === "GLOBAL_SECURITY" && !templateKey.trim())
      return setError("templateKey is required for a global security test.");
    if (scenarios.length === 0) return setError("Add at least one scenario.");

    const cleanFields = fields.filter((f) => f.name.trim());
    const builtScenarios = [];
    for (const s of scenarios) {
      let headerOverrides: Record<string, string> | undefined;
      if (s.condition === "CUSTOM" && s.headerOverrides.trim()) {
        try {
          headerOverrides = JSON.parse(s.headerOverrides);
        } catch {
          return setError("A scenario's custom headers must be valid JSON.");
        }
      }
      const expect: Record<string, unknown> = {};
      const st = parseStatuses(s.expectStatus);
      if (st !== undefined) expect.status = st;
      const bc = s.bodyContains.split("\n").map((l) => l.trim()).filter(Boolean);
      if (bc.length) expect.bodyContains = bc;
      builtScenarios.push({
        name: s.name.trim() || undefined,
        condition: s.condition,
        tokenOverride: s.tokenOverride.trim() || undefined,
        headerOverrides,
        expect,
      });
    }

    let body: unknown;
    if (cleanFields.length === 0 && rawBody.trim()) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        body = rawBody; // send as raw string
      }
    }

    const config: Record<string, unknown> = {
      method,
      ...(Object.keys(toRecord(headers)).length ? { headers: toRecord(headers) } : {}),
      ...(Object.keys(toRecord(query)).length ? { query: toRecord(query) } : {}),
      ...(cleanFields.length
        ? { contentType, form: { name: formName.trim() || undefined, fields: cleanFields } }
        : {}),
      ...(body !== undefined ? { body } : {}),
      ...(timeoutSeconds.trim() ? { timeoutSeconds: Number(timeoutSeconds) } : {}),
      scenarios: builtScenarios,
    };

    setSaving(true);
    try {
      if (isEdit && definition) {
        await updateTestDefinition(
          companyId, environmentId, serviceId, targetId, definition.id,
          { name: name.trim(), enabled, config },
          accessToken,
        );
      } else {
        await createTestDefinition(
          companyId, environmentId, serviceId, targetId,
          { name: name.trim(), type, enabled, templateKey: templateKey.trim() || undefined, config },
          accessToken,
        );
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(getTestErrorMessage(e, "Failed to save the test."));
    } finally {
      setSaving(false);
    }
  };

  const kvEditor = (label: string, rows: KV[], setRows: (r: KV[]) => void) => (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={() => setRows([...rows, { key: "", value: "" }])}>
          Add
        </Button>
      </Box>
      {rows.map((r, i) => (
        <Box key={i} sx={{ display: "flex", gap: 1, mb: 1 }}>
          <TextField size="small" label="Key" value={r.key}
            onChange={(e) => setRows(rows.map((x, idx) => (idx === i ? { ...x, key: e.target.value } : x)))}
            sx={{ flex: 1 }} />
          <TextField size="small" label="Value" value={r.value}
            onChange={(e) => setRows(rows.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)))}
            sx={{ flex: 1 }} />
          <IconButton size="small" onClick={() => setRows(rows.filter((_, idx) => idx !== i))}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {isEdit ? "Edit test" : "Add test"}
        {isEdit && aiEnabled && (
          <Button
            size="small"
            startIcon={<AutoAwesomeIcon />}
            onClick={handleImprove}
            disabled={improving}
          >
            {improving ? "Improving…" : "Improve with AI"}
          </Button>
        )}
      </DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {improveRationale && (
          <Alert severity="info" sx={{ mb: 2 }} onClose={() => setImproveRationale(null)}>
            {improveRationale}
          </Alert>
        )}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required fullWidth />
            <TextField select label="Type" value={type} onChange={(e) => setType(e.target.value as TestType)}
              disabled={isEdit} sx={{ minWidth: 170 }}
              helperText={isEdit ? "Immutable" : TYPE_OPTIONS.find((o) => o.value === type)?.hint}>
              {TYPE_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
          </Box>
          {type === "GLOBAL_SECURITY" && (
            <TextField label="Template key" value={templateKey} onChange={(e) => setTemplateKey(e.target.value)} fullWidth />
          )}
          <FormControlLabel
            control={<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />}
            label="Enabled (included in runs)" />

          <Divider textAlign="left"><Typography variant="subtitle2">Request</Typography></Divider>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField select label="Method" value={method} onChange={(e) => setMethod(e.target.value)} sx={{ minWidth: 110 }}>
              {HTTP_METHODS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </TextField>
            <TextField select label="Body encoding" value={contentType}
              onChange={(e) => setContentType(e.target.value as RequestContentType)} sx={{ minWidth: 160 }}>
              {CONTENT_TYPES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <TextField label="Timeout / token validity (s)" value={timeoutSeconds}
              onChange={(e) => setTimeoutSeconds(e.target.value)} fullWidth />
          </Box>
          {kvEditor("Headers", headers, setHeaders)}
          {kvEditor("Query params", query, setQuery)}

          {/* Form simulator */}
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Form fields (simulate the targeted form) — form name:
              </Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={() => setFields((p) => [...p, { name: "", type: "text", value: "" }])}>
                Add field
              </Button>
            </Box>
            <TextField size="small" placeholder="e.g. login form" value={formName}
              onChange={(e) => setFormName(e.target.value)} sx={{ mb: 1 }} fullWidth />
            {fields.map((f, i) => (
              <Box key={i} sx={{ display: "flex", gap: 1, mb: 1, alignItems: "center" }}>
                <TextField size="small" label="Field" value={f.name}
                  onChange={(e) => setFields(fields.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))}
                  sx={{ flex: 1 }} />
                <TextField select size="small" label="Type" value={f.type}
                  onChange={(e) => setFields(fields.map((x, idx) => (idx === i ? { ...x, type: e.target.value as FormFieldType } : x)))}
                  sx={{ minWidth: 110 }}>
                  {FORM_FIELD_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
                <TextField size="small" label="Value" type={f.type === "password" ? "password" : "text"} value={f.value ?? ""}
                  onChange={(e) => setFields(fields.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)))}
                  sx={{ flex: 1 }} />
                <FormControlLabel sx={{ m: 0 }} control={
                  <Checkbox size="small" checked={Boolean(f.secret) || f.type === "password"}
                    onChange={(e) => setFields(fields.map((x, idx) => (idx === i ? { ...x, secret: e.target.checked } : x)))} />
                } label="secret" />
                <IconButton size="small" onClick={() => setFields(fields.filter((_, idx) => idx !== i))}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
          <TextField label="Raw body (JSON or text — used when there are no form fields)"
            value={rawBody} onChange={(e) => setRawBody(e.target.value)} multiline minRows={2} fullWidth />

          <Divider textAlign="left">
            <Typography variant="subtitle2">Auth / scenario matrix</Typography>
          </Divider>
          <Typography variant="caption" color="text.secondary">
            The test runs once per scenario. Each asserts its own expected status/body.
          </Typography>
          {scenarios.map((s, i) => (
            <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
                <TextField select size="small" label="Condition" value={s.condition}
                  onChange={(e) => updateScenario(i, { condition: e.target.value as ScenarioCondition })}
                  sx={{ minWidth: 190 }}>
                  {SCENARIO_CONDITIONS.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                </TextField>
                <TextField size="small" label="Expected status (e.g. 200 or 401,403)" value={s.expectStatus}
                  onChange={(e) => updateScenario(i, { expectStatus: e.target.value })} sx={{ flex: 1 }} />
                <IconButton size="small" onClick={() => removeScenario(i)}><DeleteIcon fontSize="small" /></IconButton>
              </Box>
              {(s.condition === "EXPIRED_TOKEN" || s.condition === "CUSTOM") && (
                <TextField size="small" label="Token to send (e.g. a known-expired token)" value={s.tokenOverride}
                  onChange={(e) => updateScenario(i, { tokenOverride: e.target.value })} fullWidth sx={{ mb: 1 }} />
              )}
              {s.condition === "CUSTOM" && (
                <TextField size="small" label='Custom headers (JSON, e.g. {"X-Role":"guest"})' value={s.headerOverrides}
                  onChange={(e) => updateScenario(i, { headerOverrides: e.target.value })} fullWidth sx={{ mb: 1 }} />
              )}
              <TextField size="small" label="Body must contain (one per line, optional)" value={s.bodyContains}
                onChange={(e) => updateScenario(i, { bodyContains: e.target.value })} multiline minRows={1} fullWidth />
            </Paper>
          ))}
          <Button size="small" startIcon={<AddIcon />} onClick={addScenario} sx={{ alignSelf: "flex-start" }}>
            Add scenario
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
