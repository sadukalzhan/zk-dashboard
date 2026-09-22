import Link from "next/link";
import { BarChart3, Factory, Package } from "lucide-react";
import type { SectionVisibility } from "@/lib/store/sections";

type Section = "production" | "finance" | "finishedProducts";

const ITEMS: Array<{ key: Section; href: string; label: string; Icon: typeof Factory }> = [
  { key: "production", href: "/", label: "Производство", Icon: Factory },
  { key: "finance", href: "/finance", label: "Финансы", Icon: BarChart3 },
  { key: "finishedProducts", href: "/finished-products", label: "Готовые продукции", Icon: Package },
];

// Главное меню: «Производство» видно всегда, остальные — по настройкам из панели.
export function MainNav({ active, sections }: { active: Section; sections: SectionVisibility }) {
  const visible = ITEMS.filter((item) => item.key === "production" || sections[item.key]);

  return (
    <nav className="ml-2 flex rounded-lg border border-[#dcdde3] bg-white p-1 shadow-sm">
      {visible.map(({ key, href, label, Icon }) => (
        <Link
          key={key}
          href={href}
          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition ${
            key === active ? "bg-[#192537] text-white shadow-sm" : "text-[#4b6b95] hover:text-[#192537]"
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
