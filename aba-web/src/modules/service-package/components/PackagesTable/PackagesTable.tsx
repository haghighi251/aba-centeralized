"use client";
import React from "react";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import type { ServicePackage } from "@/modules/service-package/types/types";

interface PackagesTableProps {
  packages: ServicePackage[];
  loading: boolean;
  canManage: boolean;
  onEdit: (pkg: ServicePackage) => void;
  onDelete: (pkg: ServicePackage) => void;
  onNotificationPreference: (pkg: ServicePackage) => void;
}

const ECOSYSTEM_COLOR: Record<string, "default" | "primary" | "secondary" | "info" | "success" | "warning" | "error"> = {
  NPM: "info",
  PYPI: "success",
  MAVEN: "warning",
  RUBYGEMS: "error",
  NUGET: "secondary",
  GO: "primary",
  OTHER: "default",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PackagesTable({
  packages,
  loading,
  canManage,
  onEdit,
  onDelete,
  onNotificationPreference,
}: PackagesTableProps) {
  const colSpan = canManage ? 7 : 6;

  return (
    <Paper>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Package Name</TableCell>
              <TableCell>Version</TableCell>
              <TableCell>Ecosystem</TableCell>
              <TableCell>Version Range</TableCell>
              <TableCell>Introduced</TableCell>
              <TableCell>Alarms</TableCell>
              {canManage && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={colSpan} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : packages.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colSpan}
                  align="center"
                  sx={{ py: 4, color: "text.secondary" }}
                >
                  No active packages for this service.
                </TableCell>
              </TableRow>
            ) : (
              packages.map((sp) => (
                <TableRow key={sp.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{sp.package.name}</TableCell>
                  <TableCell>{sp.package.version}</TableCell>
                  <TableCell>
                    <Chip
                      label={sp.package.ecosystem}
                      size="small"
                      color={ECOSYSTEM_COLOR[sp.package.ecosystem] ?? "default"}
                    />
                  </TableCell>
                  <TableCell>{sp.versionRange ?? "—"}</TableCell>
                  <TableCell>{formatDate(sp.introducedAt)}</TableCell>
                  <TableCell>{sp.alarmCount}</TableCell>
                  {canManage && (
                    <TableCell align="right">
                      <Tooltip
                        title={
                          sp.notificationState?.muted
                            ? "Notifications muted — click to unmute"
                            : "Mute or snooze notifications"
                        }
                      >
                        <IconButton
                          size="small"
                          aria-label={`Notification preference for ${sp.package.name}`}
                          onClick={() => onNotificationPreference(sp)}
                        >
                          {sp.notificationState?.muted ? (
                            <NotificationsOffIcon fontSize="small" color="warning" />
                          ) : (
                            <NotificationsActiveIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                      <IconButton
                        size="small"
                        aria-label={`Edit ${sp.package.name}`}
                        onClick={() => onEdit(sp)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label={`Delete ${sp.package.name}`}
                        onClick={() => onDelete(sp)}
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
  );
}
