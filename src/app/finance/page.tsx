import { redirect } from "next/navigation";

// Раздел «Финансы» временно скрыт — перенаправляем на «Готовые продукции».
export default function FinancePage() {
  redirect("/finished-products");
}
