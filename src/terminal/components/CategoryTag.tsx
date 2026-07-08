import type { ProjectCategory } from "../app/types";

interface CategoryTagProps {
  category: ProjectCategory;
  size?: "sm" | "md";
}

export default function CategoryTag({ category, size = "sm" }: CategoryTagProps) {
  const colors: Record<ProjectCategory, string> = {
    AI: "bg-purple-100 text-purple-700",
    Infra: "bg-blue-100 text-blue-700",
    DeFi: "bg-emerald-100 text-emerald-700",
    Consumer: "bg-pink-100 text-pink-700",
    Gaming: "bg-orange-100 text-orange-700",
    Meme: "bg-yellow-100 text-yellow-700",
    RWA: "bg-teal-100 text-teal-700",
    Utility: "bg-zinc-200 text-zinc-700",
    Other: "bg-zinc-100 text-zinc-600",
  };

  return (
    <span
      className={`inline-block rounded-full font-medium tracking-tight ${colors[category]} ${
        size === "sm" ? "px-2.5 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
      }`}
    >
      {category}
    </span>
  );
}