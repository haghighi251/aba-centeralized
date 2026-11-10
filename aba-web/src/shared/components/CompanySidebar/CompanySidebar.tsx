"use client";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import DashboardIcon from "@mui/icons-material/Dashboard";
import BusinessIcon from "@mui/icons-material/Business";
import PeopleIcon from "@mui/icons-material/People";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import LayersIcon from "@mui/icons-material/Layers";
import GroupsIcon from "@mui/icons-material/Groups";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import LogoutIcon from "@mui/icons-material/Logout";
import PaymentIcon from "@mui/icons-material/Payment";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import Chip from "@mui/material/Chip";
import { UrlMapper } from "@/shared/types/URLMapper";

export const COMPANY_SIDEBAR_WIDTH = 240;

const ROLE_LABEL: Record<string, string> = {
  BUSINESS_OWNER: "Owner",
  BUSINESS_ADMIN: "Admin",
  BUSINESS_MEMBER: "Member",
};

interface Props {
  companyId: string;
  companyName: string;
  userName: string;
  role: string;
}

export default function CompanySidebar({ companyId, companyName, userName, role }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [usersOpen, setUsersOpen] = useState(
    pathname.includes(`/company/${companyId}/users`),
  );

  const base = `/company/${companyId}`;
  const canManageUsers = role === "BUSINESS_OWNER" || role === "BUSINESS_ADMIN";

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: COMPANY_SIDEBAR_WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: COMPANY_SIDEBAR_WIDTH,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* Branding */}
      <Box sx={{ px: 2, py: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" noWrap>
          {companyName}
        </Typography>
        <Typography variant="body2" fontWeight={600} noWrap>
          {userName}
        </Typography>
        <Chip
          label={ROLE_LABEL[role] ?? role}
          size="small"
          sx={{ mt: 0.5 }}
          color={role === "BUSINESS_OWNER" ? "primary" : "default"}
        />
      </Box>
      <Divider />

      {/* Navigation */}
      <List sx={{ flexGrow: 1, pt: 1 }}>
        {/* Dashboard */}
        <ListItemButton
          selected={pathname === base}
          onClick={() => router.push(base)}
        >
          <ListItemIcon sx={{ minWidth: 36 }}><DashboardIcon /></ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItemButton>

        {/* Business Details */}
        <ListItemButton
          selected={pathname === `${base}/details`}
          onClick={() => router.push(`${base}/details`)}
        >
          <ListItemIcon sx={{ minWidth: 36 }}><BusinessIcon /></ListItemIcon>
          <ListItemText primary="Business Details" />
        </ListItemButton>

        {/* Teams — visible to all company members */}
        <ListItemButton
          selected={pathname === `${base}/teams`}
          onClick={() => router.push(`${base}/teams`)}
        >
          <ListItemIcon sx={{ minWidth: 36 }}><GroupsIcon /></ListItemIcon>
          <ListItemText primary="Teams" />
        </ListItemButton>

        {/* Environments — visible to all company members */}
        <ListItemButton
          selected={pathname === `${base}/environments`}
          onClick={() => router.push(`${base}/environments`)}
        >
          <ListItemIcon sx={{ minWidth: 36 }}><LayersIcon /></ListItemIcon>
          <ListItemText primary="Environments" />
        </ListItemButton>

        {/* Users — only for OWNER and ADMIN */}
        {canManageUsers && (
          <>
            <ListItemButton onClick={() => setUsersOpen((o) => !o)}>
              <ListItemIcon sx={{ minWidth: 36 }}><PeopleIcon /></ListItemIcon>
              <ListItemText primary="Users" />
              {usersOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={usersOpen} timeout="auto" unmountOnExit>
              <List disablePadding>
                <ListItemButton
                  sx={{ pl: 4 }}
                  selected={pathname === `${base}/users`}
                  onClick={() => router.push(`${base}/users`)}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <PeopleIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="User List"
                    primaryTypographyProps={{ fontSize: "0.875rem" }}
                  />
                </ListItemButton>
                <ListItemButton
                  sx={{ pl: 4 }}
                  selected={pathname === `${base}/users/add`}
                  onClick={() => router.push(`${base}/users/add`)}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <PersonAddIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Add User"
                    primaryTypographyProps={{ fontSize: "0.875rem" }}
                  />
                </ListItemButton>
              </List>
            </Collapse>
          </>
        )}
      </List>

      <Divider />
      <List>
        <ListItemButton
          selected={pathname === `${base}/help`}
          onClick={() => router.push(`${base}/help`)}
        >
          <ListItemIcon sx={{ minWidth: 36 }}><HelpOutlineIcon /></ListItemIcon>
          <ListItemText primary="Help & Support" />
        </ListItemButton>
        <ListItemButton
          selected={pathname === UrlMapper.PRICING}
          onClick={() => router.push(UrlMapper.PRICING)}
        >
          <ListItemIcon sx={{ minWidth: 36 }}><PaymentIcon /></ListItemIcon>
          <ListItemText primary="Pricing & Plans" />
        </ListItemButton>
        <ListItemButton onClick={() => signOut({ callbackUrl: UrlMapper.LOGIN })}>
          <ListItemIcon sx={{ minWidth: 36 }}><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </List>
    </Drawer>
  );
}
