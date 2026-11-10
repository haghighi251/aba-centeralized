"use client";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import Box from "@/components/Box/Box";
import Button from "@/components/Button/Button";
import { UrlMapper } from "@/shared/types/URLMapper";

const CtaSection = () => {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        px: 2,
        textAlign: "center",
        bgcolor: "primary.main",
        color: "#fff",
      }}
    >
      <Box
        component="h2"
        sx={{ m: 0, mb: 2, fontSize: { xs: "1.5rem", md: "2rem" }, fontWeight: 700 }}
      >
        {t("home-cta-title")}
      </Box>
      <Box
        component="p"
        sx={{ m: 0, mb: 5, opacity: 0.85, fontSize: "1rem", maxWidth: 520, mx: "auto" }}
      >
        {t("home-cta-subtitle")}
      </Box>
      <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
        <Button
          component={Link}
          href={UrlMapper.REGISTER}
          variant="contained"
          sx={{
            bgcolor: "#fff",
            color: "primary.main",
            fontWeight: 600,
            px: 4,
            py: 1.5,
            "&:hover": { bgcolor: "#e3f2fd" },
          }}
        >
          {t("home-cta-register")}
        </Button>
        <Button
          component={Link}
          href={UrlMapper.LOGIN}
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
          {t("home-cta-login")}
        </Button>
      </Box>
    </Box>
  );
};

export default CtaSection;
