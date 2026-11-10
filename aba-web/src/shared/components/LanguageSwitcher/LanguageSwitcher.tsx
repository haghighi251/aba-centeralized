"use client";

import Button from "@mui/material/Button";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

import { languages } from "@/shared/utils/i18n/settings";

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const router = useRouter();
  const currentLanguage = i18n.resolvedLanguage;

  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
    router.refresh();
  };

  return (
    <div>1111122
      {languages.map((language) => {
        if (language === currentLanguage) {
          return null;
        }
        return (
            <Button key={language} onClick={() => changeLanguage(language)} sx={{color: "red"}}>
              --- {language} ---
            </Button>
        );
      })}
    </div>
  );
};
