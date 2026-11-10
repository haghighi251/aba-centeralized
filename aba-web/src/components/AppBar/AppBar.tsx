'use client';

import AdbIcon from "@mui/icons-material/Adb";
import MenuIcon from "@mui/icons-material/Menu";
import MuiAppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import * as React from "react";

import { LanguageSwitcher } from "@/shared/components/LanguageSwitcher/LanguageSwitcher";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import type {
  IAppBarProps,
  AppBarSetting} from "@/shared/types/components/appBar";
import {
  AppBarPage
} from "@/shared/types/components/appBar";

const AppBar = ({
  logoText,
  logoPath,
  pages,
  settings,
  settingsTitle,
  profile,
  profileLabel,
  actionProps,
}: IAppBarProps) => {
  
  const [anchorElNav, setAnchorElNav] = React.useState<null | HTMLElement>(
    null
  );
  const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(
    null
  );
  const router = useRouter();

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget);
    actionProps?.handleOpenNavMenu?.();
  };
  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
    actionProps?.handleOpenUserMenu?.();
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
    actionProps?.handleCloseNavMenu?.();
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
    actionProps?.handleCloseUserMenu?.();
  };

  const handleSettingItemClick = (setting: AppBarSetting) => {
    if (setting?.onClick) {
      setting.onClick();
    } else if (setting?.path) {
      router.push(setting.path);
    }
    handleCloseUserMenu();
  };

  return (
    <MuiAppBar position="static">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <AdbIcon sx={{ display: { xs: "none", md: "flex" }, mr: 1 }} />
          <Typography
            variant="h6"
            noWrap
            component="a"
            href={logoPath}
            sx={{
              mr: 2,
              display: { xs: "none", md: "flex" },
              fontFamily: "monospace",
              fontWeight: 700,
              letterSpacing: ".3rem",
              color: "inherit",
              textDecoration: "none",
            }}
          >
            {logoText}
          </Typography>

          <LanguageSwitcher />

          <Box sx={{ flexGrow: 1, display: { xs: "flex", md: "none" } }}>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "left",
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "left",
              }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{ display: { xs: "block", md: "none" } }}
            >
              {pages.map((page: AppBarPage) => (
                <MenuItem
                  key={page.path}
                  onClick={() => {
                    handleCloseNavMenu();
                    router.push(page.path);
                  }}
                >
                  <Typography sx={{ textAlign: "center" }}>
                    {page.name}
                  </Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>
          <AdbIcon sx={{ display: { xs: "flex", md: "none" }, mr: 1 }} />
          <Typography
            variant="h5"
            noWrap
            component="a"
            href="#app-bar-with-responsive-menu"
            sx={{
              mr: 2,
              display: { xs: "flex", md: "none" },
              flexGrow: 1,
              fontFamily: "monospace",
              fontWeight: 700,
              letterSpacing: ".3rem",
              color: "inherit",
              textDecoration: "none",
            }}
          >
            LOGO
          </Typography>
          <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" } }}>
            {pages.map((page: AppBarPage) => (
              <Button
                key={page.path}
                onClick={() => router.push(page.path)}
                sx={{ my: 2, color: "white", display: "block" }}
              >
                {page.name}
              </Button>
            ))}
          </Box>
          <Box sx={{ flexGrow: 0 }}>
            <Tooltip title={settingsTitle}>
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0, gap: 1 }}>
                <Avatar alt={profile.title} src={profile.avatar} />
                {profileLabel && (
                  <Typography sx={{ color: "inherit", fontWeight: 500 }}>
                    {profileLabel}
                  </Typography>
                )}
              </IconButton>
            </Tooltip>
            <Menu
              sx={{ mt: "45px" }}
              id="menu-appbar"
              anchorEl={anchorElUser}
              anchorOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
            >
              {settings.map((setting: AppBarSetting) => (
                <MenuItem key={setting.name} onClick={() => handleSettingItemClick(setting)}>
                  <Typography sx={{ textAlign: "center" }}>
                    {setting.name}
                  </Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>
        </Toolbar>
      </Container>
    </MuiAppBar>
  );
}
export default AppBar;
