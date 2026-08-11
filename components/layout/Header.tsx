"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/dna", label: "DNA" },
  { href: "/planning", label: "规划" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary shadow-sm shadow-primary/20 group-hover:shadow-md group-hover:shadow-primary/30 transition-shadow">
            <MapPin className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Travel Copilot</span>
        </Link>

        <nav className="flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-1.5 text-xs rounded-lg transition-all",
                pathname === link.href || pathname.startsWith(link.href + "/")
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="w-px h-4 bg-border mx-1" />
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/5 border border-primary/10">
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="text-[10px] text-primary font-medium">L1 MVP</span>
          </div>
        </nav>
      </div>
    </header>
  );
}
