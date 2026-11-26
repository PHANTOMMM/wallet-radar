"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Section tab. The layout cannot know which child route is active, so read the path here. */
export function TabLink({ href, label }: { href: string; label: string }) {
  const path = usePathname();
  const isOverview = href.split("/").length === 4; // /wallet/<chain>/<address>
  const active = isOverview ? path === href : path === href || path.startsWith(href + "/");
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={`whitespace-nowrap rounded-md border px-3 py-1.5 text-sm ${active ? "border-line bg-raised text-ink" : "border-transparent text-mute hover:text-ink"}`}>
      {label}
    </Link>
  );
}
