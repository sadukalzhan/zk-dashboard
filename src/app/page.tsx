import { redirect } from "next/navigation";

// Раздел «Производство» временно скрыт — главная ведёт на «Готовые продукции».
export default function Home() {
  redirect("/finished-products");
}
