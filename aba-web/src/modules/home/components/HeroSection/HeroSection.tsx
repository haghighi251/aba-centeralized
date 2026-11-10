"use client";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import Box from "@/components/Box/Box";
import Button from "@/components/Button/Button";
import { UrlMapper } from "@/shared/types/URLMapper";

const HeroSection = () => {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #1e3a5f 0%, #0d47a1 60%, #1565c0 100%)",
        color: "#fff",
        py: { xs: 10, md: 16 },
        px: 2,
        textAlign: "center",
      }}
    >
      <Box
        component="h1"
        sx={{
          m: 0,
          mb: 3,
          fontSize: { xs: "2rem", md: "3rem" },
          fontWeight: 700,
          lineHeight: 1.2,
          maxWidth: 760,
          mx: "auto",
        }}
      >
        {t("home-hero-title")}
      </Box>

      <Box
        component="p"
        sx={{
          m: 0,
          mb: 5,
          fontSize: { xs: "1rem", md: "1.25rem" },
          opacity: 0.85,
          maxWidth: 600,
          mx: "auto",
        }}
      >
        {t("home-hero-subtitle")}
      </Box>

      <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
        <Button
          component={Link}
          href={UrlMapper.REGISTER}
          variant="contained"
          sx={{
            bgcolor: "#fff",
            color: "#0d47a1",
            fontWeight: 600,
            px: 4,
            py: 1.5,
            "&:hover": { bgcolor: "#e3f2fd" },
          }}
        >
          {t("home-hero-cta-primary")}
        </Button>
        <Button
          component={Link}
          href="/contact"
          variant="outlined"
          sx={{
            borderColor: "#fff",
            color: "#fff",
            fontWeight: 600,
            px: 4,
            py: 1.5,
            "&:hover": { borderColor: "#bbdefb", color: "#bbdefb" },
          }}
        >
          {t("home-hero-cta-secondary")}
        </Button>
      </Box>
    </Box>
  );
};

export default HeroSection;
