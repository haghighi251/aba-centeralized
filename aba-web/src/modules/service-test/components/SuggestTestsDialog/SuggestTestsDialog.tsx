"use client";
import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import {
  aiSuggestTests,
  createTestDefinition,
  getTestErrorMessage,
} from "@/modules/service-test/services/testService";
import type {
  AiUsageInfo,
  TestPage,
  TestSuggestion,
} from "@/modules/service-test/types/types";

export interface SuggestTestsDialogProps {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  companyId: string;
  environmentId: number;
  serviceId: number;
  page: TestPage | null;
  accessToken: string;
}

const COUNTS = [3, 5, 8];

export default function SuggestTestsDialog({
  open,
  onClose,
  onAdded,
  companyId,
  environmentId,
  serviceId,
  page,
  accessToken,
}: SuggestTestsDialogProps) {
  const [count, setCount] = useState(5);
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<TestSuggestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [usage, setUsage] = useState<AiUsageInfo | null>(null);

  const reset = () => {
    setSuggestions([]);
    setSelected(new Set());
    setUsage(null);
    setError(null);
  };

  const handleGenerate = async () => {
    if (!page) return;
    setLoading(true);
    setError(null);
    try {
      const res = await aiSuggestTests(
        companyId,
        environmentId,
        serviceId,
        page.id,
        { count, instructions: instructions.trim() || undefined },
        accessToken,
      );
      setSuggestions(res.suggestions);
      setUsage(res.usage);
      setSelected(new Set(res.suggestions.map((_, i) => i)));
    } catch (e) {
      setError(getTestErrorMessage(e, "Failed to get suggestions."));
    } finally {
      setLoading(false);
    }
  };

  const toggle = (i: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const handleAdd = async () => {
    if (!page) return;
    setAdding(true);
    setError(null);
    try {
      for (const i of Array.from(selected)) {
        const s = suggestions[i];
        if (!s) continue;
        await createTestDefinition(
          companyId,
          environmentId,
          serviceId,
          page.id,
          {
            name: s.title.slice(0, 120),
            type: s.type,
            enabled: true,
            source: "AI_SUGGESTED",
            config: s.config ?? undefined,
            assertions: s.assertions ?? undefined,
          },
          accessToken,
        );
      }
      onAdded();
      handleClose();
    } catch (e) {
      setError(getTestErrorMessage(e, "Failed to add the selected tests."));
    } finally {
      setAdding(false);
    }
  };

  const handleClose = () => {
    reset();
    setInstructions("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <AutoAwesomeIcon color="primary" fontSize="small" />
        Suggest tests for “{page?.name}”
      </DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start", mt: 1, mb: 2 }}>
          <TextField
            select
            size="small"
            label="How many"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            sx={{ minWidth: 110 }}
          >
            {COUNTS.map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="Guidance (optional)"
            placeholder="e.g. focus on auth bypass and rate limiting"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            fullWidth
          />
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={loading || !page}
            sx={{ whiteSpace: "nowrap" }}
          >
            {loading ? "Thinking…" : suggestions.length ? "Regenerate" : "Generate"}
          </Button>
        </Box>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && suggestions.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Click “Generate” to get AI-suggested security tests for this page.
            Review each, then select the ones to add.
          </Typography>
        )}

        {suggestions.map((s, i) => (
          <Accordion key={i} disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Checkbox
                checked={selected.has(i)}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(i);
                }}
                sx={{ mr: 1 }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={600}>{s.title}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {s.summary}
                </Typography>
              </Box>
              <Chip label={s.type} size="small" sx={{ mr: 1 }} />
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {s.detail}
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Chip
                  size="small"
                  variant="outlined"
                  label={s.config ? "Request configured" : "No request config"}
                  color={s.config ? "success" : "default"}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={s.assertions ? "Assertions set" : "No assertions"}
                  color={s.assertions ? "success" : "default"}
                />
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}

        {usage && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
            Used {usage.inputTokens + usage.outputTokens} tokens ({usage.model}).
            Remaining this period: {usage.remaining.toLocaleString()}.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={adding}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleAdd}
          disabled={adding || selected.size === 0}
        >
          {adding ? "Adding…" : `Add selected (${selected.size})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
