import { TRegisterCompany } from "@/shared/types/company/addNewCompany";
import { FormEventHandler } from "react";

export interface IRegisterPageProps {};

export type TRegisterPageFieldValues = TRegisterCompany & { rePassword: string };

export enum RegisterCompanyFields {
  Email = "email",
  Website = "website",
  Password = "password",
  RePassword = "rePassword",
  FirstName = "firstName",
  LastName = "lastName",
  Phone = "phone",
  Address = "address",
  City = "city",
  State = "state",
  Country = "country",
  PostalCode = "postalCode",
  Agreement = "agreement",
}

export type RegisterCompanyFieldValues = {
  [RegisterCompanyFields.Email]: string;
  [RegisterCompanyFields.Website]: string;
  [RegisterCompanyFields.Password]: string;
  [RegisterCompanyFields.RePassword]: string;
  [RegisterCompanyFields.FirstName]: string;
  [RegisterCompanyFields.LastName]: string;
  [RegisterCompanyFields.Phone]?: string;
  [RegisterCompanyFields.Address]?: string;
  [RegisterCompanyFields.City]?: string;
  [RegisterCompanyFields.State]?: string;
  [RegisterCompanyFields.Country]?: string;
  [RegisterCompanyFields.PostalCode]?: string;
  [RegisterCompanyFields.Agreement]: boolean;
};

export interface IRegisterFormProps {
  onHandleSubmit: FormEventHandler<HTMLFormElement>;
  addCompanyIsLoading: boolean;
  tokenIsLoading: boolean;
}