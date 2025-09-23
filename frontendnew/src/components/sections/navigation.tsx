"use client";

import Link from "next/link";
import { Smile, ChevronDown } from "lucide-react";
import { ConnectButton } from '@rainbow-me/rainbowkit';

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { name: "GET USDog", href: "/vaults", active: true },
  { name: "STAKE", href: "/stake", active: false },
];

const Navigation = () => {
  return (
    <header className="sticky top-5 z-50 mx-auto max-w-[1200px] rounded-2xl bg-card px-4 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
      <div className="flex h-20 items-center justify-between">
        <div className="flex items-center gap-x-8">
          <Link href="/" className="flex shrink-0 items-center gap-x-2">
            <Smile className="h-8 w-8 text-primary" />
            <span className="font-logo text-foreground">USDog</span>
          </Link>
          <nav className="hidden items-center gap-x-6 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={`font-navigation whitespace-nowrap transition-colors hover:text-foreground/80 ${
                  link.active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-x-1.5 rounded-full px-4 py-2 font-button"
              >
                More
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Docs</DropdownMenuItem>
              <DropdownMenuItem>Github</DropdownMenuItem>
              <DropdownMenuItem>Discord</DropdownMenuItem>
              {/* Mobile nav items */}
              <div className="lg:hidden">
                {navLinks.map((link) => (
                   <DropdownMenuItem key={link.name} asChild>
                     <Link href={link.href}>{link.name}</Link>
                   </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <ConnectButton />
        </div>
      </div>
    </header>
  );
};

export default Navigation;