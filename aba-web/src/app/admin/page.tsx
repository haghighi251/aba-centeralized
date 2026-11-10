import { redirect } from "next/navigation";
import { UrlMapper } from "@/shared/types/URLMapper";

export default function AdminPage() {
  redirect(UrlMapper.ADMIN_CUSTOMERS);
}
