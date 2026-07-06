import {
  File,
  FileCode,
  FileJson,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const extMap: Record<string, { Icon: LucideIcon; className?: string }> = {
  ".js": { Icon: FileCode, className: "text-[#F7DF1E]" },
  ".jsx": { Icon: FileCode, className: "text-[#F7DF1E]" },
  ".mjs": { Icon: FileCode, className: "text-[#F7DF1E]" },
  ".cjs": { Icon: FileCode, className: "text-[#F7DF1E]" },
  ".ts": { Icon: FileCode, className: "text-[#3178C6]" },
  ".tsx": { Icon: FileCode, className: "text-[#3178C6]" },
  ".json": { Icon: FileJson, className: "text-[#CBBC6F]" },
  ".md": { Icon: FileText, className: "text-[#519ABA]" },
  ".mdx": { Icon: FileText, className: "text-[#519ABA]" },
  ".html": { Icon: FileText, className: "text-[#e34c26]" },
  ".htm": { Icon: FileText, className: "text-[#e34c26]" },
  ".css": { Icon: FileCode, className: "text-[#563d7c]" },
  ".scss": { Icon: FileCode, className: "text-[#c6538c]" },
};

export function getFileIcon(name: string) {
  const i = name.lastIndexOf(".");
  const ext = i >= 0 ? name.slice(i).toLowerCase() : "";
  const entry = extMap[ext];
  if (entry) return entry;
  return { Icon: File, className: "text-cursor-text-muted" };
}

export function FileIcon({ name, className }: { name: string; className?: string }) {
  const { Icon, className: iconClass } = getFileIcon(name);
  return <Icon className={cn("h-4 w-4 shrink-0", iconClass, className)} aria-hidden />;
}
