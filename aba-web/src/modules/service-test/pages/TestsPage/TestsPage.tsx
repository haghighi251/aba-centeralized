"use client";
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { queryClient } from "@/components/ReactQueryProvider/ReactQueryProvider";
import { QueryKey } from "@/modules/shared/types/QueryKey";
import {
  useAiStatus,
  useTestDefinitions,
  useTestRuns,
  useTestPages,
} from "@/modules/service-test/hooks/useTestData";
import {
  cloneTestDefinition,
  deleteTestDefinition,
  deleteTestPage,
  getTestErrorMessage,
  runTests,
} from "@/modules/service-test/services/testService";
import PageFormDialog from "@/modules/service-test/components/PageFormDialog/PageFormDialog";
import DefinitionFormDialog from "@/modules/service-test/components/DefinitionFormDialog/DefinitionFormDialog";
import RunDetailDialog from "@/modules/service-test/components/RunDetailDialog/RunDetailDialog";
import SuggestTestsDialog from "@/modules/service-test/components/SuggestTestsDialog/SuggestTestsDialog";
import type {
  TestDefinition,
  TestRunStatus,
  TestPage,
} from "@/modules/service-test/types/types";

const RUN_STATUS_COLOR: Record<
  TestRunStatus,
  "default" | "success" | "error" | "warning" | "info"
> = {
  QUEUED: "info",
  RUNNING: "info",
  PASSED: "success",
  FAILED: "error",
  ERROR: "error",
  CANCELLED: "default",
};

export default function TestsPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();

  const companyId = params.id as string;
  const environmentId = Number(params.envId);
  const serviceId = Number(params.serviceId);

  const user = session?.user as
    | { tokens?: { accessToken?: string }; role?: string }
    | undefined;
  const accessToken = user?.tokens?.accessToken ?? "";
  const isManager =
    user?.role === "BUSINESS_OWNER" || user?.role === "BUSINESS_ADMIN";

  const [selectedTarget, setSelectedTarget] = useState<TestPage | null>(null);
  const [targetDialogOpen, setTargetDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<TestPage | null>(null);
  const [defDialogOpen, setDefDialogOpen] = useState(false);
  const [editingDef, setEditingDef] = useState<TestDefinition | null>(null);
  const [detailRunId, setDetailRunId] = useState<number | null>(null);
  const [suggestDialogOpen, setSuggestDialogOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: aiStatus } = useAiStatus(
    companyId,
    environmentId,
    serviceId,
    accessToken,
  );
  const aiEnabled = Boolean(aiStatus?.enabled);
  const aiHasTokens = aiEnabled && (aiStatus?.remaining ?? 0) > 0;

  const { data: targetsData, isLoading: targetsLoading, error: targetsError } =
    useTestPages(companyId, environmentId, serviceId, accessToken);
  const targets = targetsData?.data ?? [];

  // Auto-select a page so the "Tests" section (and "Add test" button) is
  // visible without the user having to discover that a page row is clickable.
  // Keeps the selected page object in sync with refreshed data after edits.
  useEffect(() => {
    if (targets.length === 0) {
      if (selectedTarget !== null) setSelectedTarget(null);
      return;
    }
    const current = selectedTarget
      ? targets.find((t) => t.id === selectedTarget.id)
      : undefined;
    if (!current) setSelectedTarget(targets[0]);
    else if (current !== selectedTarget) setSelectedTarget(current);
  }, [targets, selectedTarget]);

  const { data: defsData, isLoading: defsLoading } = useTestDefinitions(
    companyId,
    environmentId,
    serviceId,
    selectedTarget?.id ?? null,
    accessToken,
  );
  const definitions = defsData?.data ?? [];

  const { data: runsData } = useTestRuns(
    companyId,
    environmentId,
    serviceId,
    accessToken,
  );
  const runs = runsData?.data ?? [];

  const invalidate = (key: QueryKey) =>
    queryClient.invalidateQueries({
      queryKey: [key, companyId, environmentId, serviceId],
    });

  const goBack = () =>
    router.push(
      `/company/${companyId}/environments/${environmentId}/services/${serviceId}/packages`,
    );

  const handleRun = async (opts: { pageId?: number; definitionId?: number }) => {
    setActionError(null);
    try {
      await runTests(companyId, environmentId, serviceId, opts, accessToken);
      invalidate(QueryKey.TestRuns);
    } catch (e) {
      setActionError(getTestErrorMessage(e, "Failed to start the test run."));
    }
  };

  const handleDeletePage = async (page: TestPage) => {
    if (!window.confirm(`Delete page "${page.name}" and all its tests?`)) return;
    setActionError(null);
    try {
      await deleteTestPage(
        companyId,
        environmentId,
        serviceId,
        page.id,
        accessToken,
      );
      if (selectedTarget?.id === page.id) setSelectedTarget(null);
      invalidate(QueryKey.TestPages);
    } catch (e) {
      setActionError(getTestErrorMessage(e, "Failed to delete the page."));
    }
  };

  const handleDeleteDef = async (def: TestDefinition) => {
    if (!selectedTarget) return;
    if (!window.confirm(`Delete test "${def.name}"?`)) return;
    setActionError(null);
    try {
      await deleteTestDefinition(
        companyId,
        environmentId,
        serviceId,
        selectedTarget.id,
        def.id,
        accessToken,
      );
      invalidate(QueryKey.TestDefinitions);
    } catch (e) {
      setActionError(getTestErrorMessage(e, "Failed to delete the test."));
    }
  };

  const handleCloneDef = async (def: TestDefinition) => {
    if (!selectedTarget) return;
    setActionError(null);
    try {
      await cloneTestDefinition(
        companyId,
        environmentId,
        serviceId,
        selectedTarget.id,
        def.id,
        accessToken,
      );
      invalidate(QueryKey.TestDefinitions);
    } catch (e) {
      setActionError(getTestErrorMessage(e, "Failed to clone the test."));
    }
  };

  return (
    <Box>
      {/* Breadcrumb */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <IconButton size="small" onClick={goBack} aria-label="Back to packages">
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="body2" color="text.secondary">
          Packages
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ScienceOutlinedIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            E2E Security Tests
          </Typography>
          {aiStatus?.enabled && (
            <Tooltip title={`AI assist enabled — ${aiStatus.remaining.toLocaleString()} tokens remaining this period`}>
              <Chip
                icon={<AutoAwesomeIcon />}
                size="small"
                color={aiHasTokens ? "primary" : "default"}
                variant="outlined"
                label={`AI: ${aiStatus.remaining.toLocaleString()} tokens`}
              />
            </Tooltip>
          )}
        </Box>
        {isManager && (
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<PlayArrowIcon />}
              onClick={() => handleRun({})}
            >
              Run all tests
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingTarget(null);
                setTargetDialogOpen(true);
              }}
            >
              Add page
            </Button>
          </Box>
        )}
      </Box>

      {(targetsError || actionError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {actionError ?? targetsError?.message}
        </Alert>
      )}

      {/* Pages */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
          Pages
        </Typography>
        {targetsLoading ? (
          <Typography variant="body2" color="text.secondary">
            Loading…
          </Typography>
        ) : targets.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No pages yet. Add a page or endpoint to start testing.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Path / URL</TableCell>
                <TableCell>Auth</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {targets.map((t) => (
                <TableRow
                  key={t.id}
                  hover
                  selected={selectedTarget?.id === t.id}
                  onClick={() => setSelectedTarget(t)}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell>{t.name}</TableCell>
                  <TableCell>{t.pageType}</TableCell>
                  <TableCell>{t.method}</TableCell>
                  <TableCell>{t.absoluteUrl ?? t.path}</TableCell>
                  <TableCell>{t.authKind}</TableCell>
                  <TableCell>
                    <Chip
                      label={t.status}
                      size="small"
                      color={t.status === "ACTIVE" ? "success" : "default"}
                    />
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    {isManager && (
                      <>
                        <Tooltip title="Run this page">
                          <IconButton
                            size="small"
                            onClick={() => handleRun({ pageId: t.id })}
                          >
                            <PlayArrowIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditingTarget(t);
                              setTargetDialogOpen(true);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => handleDeletePage(t)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Definitions for selected target */}
      {selectedTarget && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1,
            }}
          >
            <Typography variant="subtitle1" fontWeight={700}>
              Tests for “{selectedTarget.name}”
            </Typography>
            {isManager && (
              <Box sx={{ display: "flex", gap: 1 }}>
                {aiEnabled && (
                  <Tooltip
                    title={
                      aiHasTokens
                        ? "Get AI-suggested security tests for this page"
                        : "AI token allowance exhausted — top up to use AI"
                    }
                  >
                    <span>
                      <Button
                        size="small"
                        startIcon={<AutoAwesomeIcon />}
                        onClick={() => setSuggestDialogOpen(true)}
                        disabled={!aiHasTokens}
                      >
                        Suggest tests (AI)
                      </Button>
                    </span>
                  </Tooltip>
                )}
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setEditingDef(null);
                    setDefDialogOpen(true);
                  }}
                >
                  Add test
                </Button>
              </Box>
            )}
          </Box>
          {defsLoading ? (
            <Typography variant="body2" color="text.secondary">
              Loading…
            </Typography>
          ) : definitions.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                This page has no tests yet. A page on its own can’t be run — add
                at least one enabled test (e.g. a request + assertions) first.
              </Typography>
              {isManager && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setEditingDef(null);
                    setDefDialogOpen(true);
                  }}
                >
                  Add the first test
                </Button>
              )}
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Engine</TableCell>
                  <TableCell>Enabled</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {definitions.map((d) => (
                  <TableRow key={d.id} hover>
                    <TableCell>{d.name}</TableCell>
                    <TableCell>{d.type}</TableCell>
                    <TableCell>{d.engine}</TableCell>
                    <TableCell>
                      <Chip
                        label={d.enabled ? "Yes" : "No"}
                        size="small"
                        color={d.enabled ? "success" : "default"}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {isManager && (
                        <>
                          <Tooltip title="Run this test">
                            <IconButton
                              size="small"
                              onClick={() =>
                                handleRun({
                                  pageId: selectedTarget.id,
                                  definitionId: d.id,
                                })
                              }
                            >
                              <PlayArrowIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Clone">
                            <IconButton size="small" onClick={() => handleCloneDef(d)}>
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditingDef(d);
                                setDefDialogOpen(true);
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => handleDeleteDef(d)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      )}

      {/* Runs */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
          Recent runs
        </Typography>
        {runs.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No runs yet.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Trigger</TableCell>
                <TableCell>Passed / Failed / Errors</TableCell>
                <TableCell>Started</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {runs.map((r) => (
                <TableRow
                  key={r.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => setDetailRunId(r.id)}
                >
                  <TableCell>
                    <Chip
                      label={r.status}
                      size="small"
                      color={RUN_STATUS_COLOR[r.status]}
                      sx={{ fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell>{r.trigger}</TableCell>
                  <TableCell>
                    {r.passedCount} / {r.failedCount} / {r.errorCount}
                  </TableCell>
                  <TableCell>
                    {new Date(r.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small">View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Dialogs */}
      <PageFormDialog
        open={targetDialogOpen}
        onClose={() => setTargetDialogOpen(false)}
        onSaved={() => invalidate(QueryKey.TestPages)}
        companyId={companyId}
        environmentId={environmentId}
        serviceId={serviceId}
        accessToken={accessToken}
        target={editingTarget}
      />
      {selectedTarget && (
        <DefinitionFormDialog
          open={defDialogOpen}
          onClose={() => setDefDialogOpen(false)}
          onSaved={() => invalidate(QueryKey.TestDefinitions)}
          companyId={companyId}
          environmentId={environmentId}
          serviceId={serviceId}
          targetId={selectedTarget.id}
          page={selectedTarget}
          accessToken={accessToken}
          definition={editingDef}
          aiEnabled={aiHasTokens}
        />
      )}
      {selectedTarget && (
        <SuggestTestsDialog
          open={suggestDialogOpen}
          onClose={() => setSuggestDialogOpen(false)}
          onAdded={() => invalidate(QueryKey.TestDefinitions)}
          companyId={companyId}
          environmentId={environmentId}
          serviceId={serviceId}
          page={selectedTarget}
          accessToken={accessToken}
        />
      )}
      <RunDetailDialog
        open={detailRunId !== null}
        onClose={() => setDetailRunId(null)}
        companyId={companyId}
        environmentId={environmentId}
        serviceId={serviceId}
        runId={detailRunId}
        accessToken={accessToken}
        aiEnabled={aiHasTokens}
      />
    </Box>
  );
}
