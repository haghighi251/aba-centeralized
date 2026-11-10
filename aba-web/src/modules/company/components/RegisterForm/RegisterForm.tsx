"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import Button from "@/components/Button/Button";
import Stack from "@/components/Stack/Stack";
import Box from "@/components/Box/Box";
import TextField from "@/components/TextField/TextField";
import { IRegisterFormProps, RegisterCompanyFields } from "../../types/types";

export default function RegisterForm({
  onHandleSubmit,
  addCompanyIsLoading,
  tokenIsLoading,
}: IRegisterFormProps) {
  const { t } = useTranslation();

  return (
    <form onSubmit={onHandleSubmit}>
      <Stack spacing={2}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <label
            htmlFor="first-name"
            className="block mb-2 text-sm font-medium text-gray-900"
          >
            {t("first-name")}
          </label>
          <TextField
            type="text"
            id="first-name"
            name={RegisterCompanyFields.FirstName}
            placeholder={t("enter-your-first-name")}
          />
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <label
            htmlFor="last-name"
            className="block mb-2 text-sm font-medium text-gray-900"
          >
            {t("last-name")}
          </label>
          <TextField
            type="text"
            id="last-name"
            name={RegisterCompanyFields.LastName}
            placeholder={t("enter-your-last-name")}
          />
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <label
            htmlFor="email"
            className="block mb-2 text-sm font-medium text-gray-900"
          >
            {t("email")}
          </label>
          <TextField
            type="email"
            id="email"
            name={RegisterCompanyFields.Email}
            placeholder={t("enter-your-email")}
            required
          />
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <label
            htmlFor="website"
            className="block mb-2 text-sm font-medium text-gray-900"
          >
            {t("website")}
          </label>
          <TextField
            type="text"
            id="website"
            name={RegisterCompanyFields.Website}
            placeholder={t("enter-your-website")}
            required
          />
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <label
            htmlFor="password"
            className="block mb-2 text-sm font-medium text-gray-900"
          >
            {t("password")}
          </label>
          <TextField
            type="password"
            id="password"
            name={RegisterCompanyFields.Password}
            placeholder={t("enter-your-password")}
            required
          />
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <label
            htmlFor="rePassword"
            className="block mb-2 text-sm font-medium text-gray-900"
          >
            {t("repeat-password")}
          </label>
          <TextField
            type="password"
            id="rePassword"
            name={RegisterCompanyFields.RePassword}
            placeholder={t("repeat-your-password-placeholder")}
            required
          />
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <label
            htmlFor="phone"
            className="block mb-2 text-sm font-medium text-gray-900"
          >
            {t("phone-number")}
          </label>
          <TextField
            type="text"
            id="phone"
            name={RegisterCompanyFields.Phone}
            placeholder={t("enter-your-phone-number")}
          />
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <label
            htmlFor="address"
            className="block mb-2 text-sm font-medium text-gray-900"
          >
            {t("address")}
          </label>
          <TextField
            type="text"
            id="address"
            name={RegisterCompanyFields.Address}
            placeholder={t("enter-your-address")}
          />
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <label
            htmlFor="postalCode"
            className="block mb-2 text-sm font-medium text-gray-900"
          >
            {t("postal-code")}
          </label>
          <TextField
            type="text"
            id="postalCode"
            name={RegisterCompanyFields.PostalCode}
            placeholder={t("enter-your-postal-code")}
          />
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <label
            htmlFor="city"
            className="block mb-2 text-sm font-medium text-gray-900"
          >
            {t("city")}
          </label>
          <TextField
            type="text"
            id="city"
            name={RegisterCompanyFields.City}
            placeholder={t("enter-your-city")}
          />
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <label
            htmlFor="state"
            className="block mb-2 text-sm font-medium text-gray-900"
          >
            {t("state")}
          </label>
          <TextField
            type="text"
            id="state"
            name={RegisterCompanyFields.State}
            placeholder={t("enter-your-state")}
          />
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <label
            htmlFor="country"
            className="block mb-2 text-sm font-medium text-gray-900"
          >
            {t("country")}
          </label>
          <TextField
            type="text"
            id="country"
            name={RegisterCompanyFields.Country}
            placeholder={t("enter-your-country")}
          />
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Button
            type="submit"
            disabled={addCompanyIsLoading || tokenIsLoading}
            {...(addCompanyIsLoading && { isProcessing: true })}
          >
            {addCompanyIsLoading
              ? t("registering")
              : t("register-button-label")}
          </Button>
        </Box>
      </Stack>
    </form>
  );
}