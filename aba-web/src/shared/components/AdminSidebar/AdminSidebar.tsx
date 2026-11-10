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
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import HistoryIcon from "@mui/icons-material/History";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import LogoutIcon from "@mui/icons-material/Logout";
import { UrlMapper } from "@/shared/types/URLMapper";

export const SIDEBAR_WIDTH = 240;

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: { label: string; path: string }[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    icon: <DashboardIcon />,
    path: UrlMapper.ADMIN,
  },
  {
    label: "Customers",
    icon: <BusinessIcon />,
    children: [
      { label: "Customer List", path: UrlMapper.ADMIN_CUSTOMERS },
    ],
  },
  {
    label: "Vulnerabilities",
    icon: <ShieldOutlinedIcon />,
    path: UrlMapper.ADMIN_VULNERABILITIES,
  },
  {
    label: "Activity Log",
    icon: <HistoryIcon />,
    path: UrlMapper.ADMIN_ACTIVITY_LOGS,
  },
];

export default function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Customers: true,
  });

  const toggle = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  const isActive = (path: string) => pathname === path;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: SIDEBAR_WIDTH,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* Logo */}
      <Box sx={{ px: 2, py: 2.5 }}>
        <Typography variant="h6" fontWeight={700} noWrap>
          Admin Panel
        </Typography>
      </Box>
      <Divider />

      {/* Nav items */}
      <List sx={{ flexGrow: 1, pt: 1 }}>
        {NAV_ITEMS.map((item) =>
          item.children ? (
            <Box key={item.label}>
              <ListItemButton onClick={() => toggle(item.label)}>
                <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
                {openGroups[item.label] ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={openGroups[item.label]} timeout="auto" unmountOnExit>
                <List disablePadding>
                  {item.children.map((child) => (
                    <ListItemButton
                      key={child.path}
                      sx={{ pl: 4 }}
                      selected={isActive(child.path)}
                      onClick={() => router.push(child.path)}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <PeopleIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={child.label}
                        primaryTypographyProps={{ fontSize: "0.875rem" }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            </Box>
          ) : (
            <ListItemButton
              key={item.label}
              selected={isActive(item.path!)}
              onClick={() => router.push(item.path!)}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ),
        )}
      </List>

      <Divider />
      {/* Logout */}
      <List>
        <ListItemButton onClick={() => signOut({ callbackUrl: UrlMapper.LOGIN })}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </List>
    </Drawer>
  );
}
