"use client";
import React, { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useTestRun } from "@/modules/service-test/hooks/useTestData";
import {
  aiExplainRun,
  getTestErrorMessage,
} from "@/modules/service-test/services/testService";
import type {
  ExplainRunResult,
  TestResultStatus,
} from "@/modules/service-test/types/types";

const STATUS_COLOR: Record<
  TestResultStatus | "QUEUED" | "RUNNING" | "PASSED" | "FAILED" | "ERROR" | "CANCELLED",
  "default" | "success" | "error" | "warning" | "info"
> = {
  PASSED: "success",
  FAILED: "error",
  ERROR: "error",
  SKIPPED: "default",
  QUEUED: "info",
  RUNNING: "info",
  CANCELLED: "default",
};

export interface RunDetailDialogProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  environmentId: number;
  serviceId: number;
  runId: number | null;
  accessToken: string;
  aiEnabled?: boolean;
}

export default function RunDetailDialog({
  open,
  onClose,
  companyId,
  environmentId,
  serviceId,
  runId,
  accessToken,
  aiEnabled = false,
}: RunDetailDialogProps) {
  const { data: run, isLoading, error } = useTestRun(
    companyId,
    environmentId,
    serviceId,
    open ? runId : null,
    accessToken,
  );

  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<ExplainRunResult | null>(null);

  // Reset the explanation whenever a different run is opened.
  useEffect(() => {
    setExplanation(null);
    setExplainError(null);
  }, [runId, open]);

  const runFinished =
    run?.status === "PASSED" ||
    run?.status === "FAILED" ||
    run?.status === "ERROR";

  const handleExplain = async () => {
    if (!runId) return;
    setExplaining(true);
    setExplainError(null);
    try {
      const res = await aiExplainRun(
        companyId,
        environmentId,
        serviceId,
        runId,
        accessToken,
      );
      setExplanation(res);
    } catch (e) {
      setExplainError(getTestErrorMessage(e, "Failed to explain the run."));
    } finally {
      setExplaining(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        Run detail
        {run && (
          <Chip
            label={run.status}
            color={STATUS_COLOR[run.status]}
            size="small"
            sx={{ ml: 1, fontWeight: 700 }}
          />
        )}
      </DialogTitle>
      <DialogContent dividers>
        {isLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress />
          </Box>
        )}
        {error && <Alert severity="error">{error.message}</Alert>}
        {run && (
          <>
            <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
              <Chip label={`Total ${run.totalCount}`} size="small" />
              <Chip label={`Passed ${run.passedCount}`} color="success" size="small" />
              <Chip label={`Failed ${run.failedCount}`} color="error" size="small" />
              <Chip label={`Errors ${run.errorCount}`} color="warning" size="small" />
              <Chip label={run.trigger} variant="outlined" size="small" />
              {aiEnabled && runFinished && run.results.length > 0 && (
                <Button
                  size="small"
                  startIcon={<AutoAwesomeIcon />}
                  onClick={handleExplain}
                  disabled={explaining}
                  sx={{ ml: "auto" }}
                >
                  {explaining ? "Explaining…" : "Explain results"}
                </Button>
              )}
            </Box>

            {explainError && (
              <Alert severity="error" sx={{ mb: 2 }}>{explainError}</Alert>
            )}
            {explanation && (
              <Alert
                severity="info"
                icon={<AutoAwesomeIcon fontSize="inherit" />}
                sx={{ mb: 2 }}
                onClose={() => setExplanation(null)}
              >
                <Typography variant="subtitle2" gutterBottom>
                  AI explanation
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {explanation.summary}
                </Typography>
                {explanation.perTest.length > 0 && (
                  <Box component="ul" sx={{ pl: 2, m: 0, mb: 1 }}>
                    {explanation.perTest.map((p, i) => (
                      <Box component="li" key={i}>
                        <Typography variant="body2">
                          <strong>{p.name}</strong> ({p.verdict}): {p.explanation}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
                {explanation.recommendations.length > 0 && (
                  <>
                    <Typography variant="subtitle2">Recommendations</Typography>
                    <Box component="ul" sx={{ pl: 2, m: 0 }}>
                      {explanation.recommendations.map((r, i) => (
                        <Box component="li" key={i}>
                          <Typography variant="body2">{r}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </>
                )}
                <Typography variant="caption" color="text.secondary">
                  {explanation.usage.inputTokens + explanation.usage.outputTokens} tokens used ·
                  {" "}
                  {explanation.usage.remaining.toLocaleString()} remaining
                </Typography>
              </Alert>
            )}

            {run.status === "QUEUED" && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Queued — waiting for the executor. This view refreshes
                automatically.
              </Alert>
            )}

            {run.results.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No results yet.
              </Typography>
            ) : (
              run.results.map((r) => (
                <Accordion key={r.id} disableGutters>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                      <Chip
                        label={r.status}
                        color={STATUS_COLOR[r.status]}
                        size="small"
                        sx={{ fontWeight: 700, minWidth: 80 }}
                      />
                      <Typography sx={{ flex: 1 }}>{r.name}</Typography>
                      {r.durationMs != null && (
                        <Typography variant="caption" color="text.secondary">
                          {r.durationMs} ms
                        </Typography>
                      )}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {r.errorMessage && (
                      <Alert severity="error" sx={{ mb: 1 }}>
                        {r.errorMessage}
                      </Alert>
                    )}
                    {r.assertionResults && r.assertionResults.length > 0 ? (
                      <Box component="ul" sx={{ pl: 2, m: 0 }}>
                        {r.assertionResults.map((a, i) => (
                          <Box
                            component="li"
                            key={i}
                            sx={{ color: a.passed ? "success.main" : "error.main" }}
                          >
                            <Typography variant="body2" component="span">
                              {a.passed ? "✓" : "✗"} {a.assertion}
                              {!a.passed &&
                                a.expected !== undefined &&
                                ` — expected ${JSON.stringify(
                                  a.expected,
                                )}, got ${JSON.stringify(a.actual)}`}
                              {a.message ? ` — ${a.message}` : ""}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No assertion details.
                      </Typography>
                    )}
                    {r.response != null && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Response
                        </Typography>
                        <Box
                          component="pre"
                          sx={{
                            m: 0,
                            p: 1,
                            bgcolor: "action.hover",
                            borderRadius: 1,
                            overflow: "auto",
                            fontSize: 12,
                            maxHeight: 200,
                          }}
                        >
                          {JSON.stringify(r.response, null, 2)}
                        </Box>
                      </Box>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
