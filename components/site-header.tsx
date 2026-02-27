"use client"

import Link from "next/link"
import Image from "next/image"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { WalletConnect } from "@/components/wallet-connect"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function SiteHeader() {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-6 max-w-[1800px]">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 relative">
              <Image
                src="/baseblox-logo.svg"
                alt="BASEBLOX"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <span className="text-xl font-heading font-bold text-[hsl(var(--ethblox-yellow))]">BASEBLOX</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {/* Old BUILDER hidden - keeping route active for backwards compatibility */}
            <Link
              href="/buildv2"
              className={cn(
                "text-sm font-medium transition-colors hover:text-[hsl(var(--ethblox-accent-cyan))]",
                isActive("/buildv2")
                  ? "text-[hsl(var(--ethblox-accent-cyan))]"
                  : "text-[hsl(var(--ethblox-text-secondary))]",
              )}
            >
              BUILD
            </Link>
            <Link
              href="/explore"
              className={cn(
                "text-sm font-medium transition-colors hover:text-[hsl(var(--ethblox-accent-cyan))]",
                isActive("/explore")
                  ? "text-[hsl(var(--ethblox-accent-cyan))]"
                  : "text-[hsl(var(--ethblox-text-secondary))]",
              )}
            >
              EXPLORE
            </Link>
            <Link
              href="/gallery"
              className={cn(
                "text-sm font-medium transition-colors hover:text-[hsl(var(--ethblox-accent-cyan))]",
                isActive("/gallery")
                  ? "text-[hsl(var(--ethblox-accent-cyan))]"
                  : "text-[hsl(var(--ethblox-text-secondary))]",
              )}
            >
              GALLERY
            </Link>
            <Link
              href="/profile"
              className={cn(
                "text-sm font-medium transition-colors hover:text-[hsl(var(--ethblox-accent-cyan))]",
                pathname.startsWith("/profile") || pathname.startsWith("/u/")
                  ? "text-[hsl(var(--ethblox-accent-cyan))]"
                  : "text-[hsl(var(--ethblox-text-secondary))]",
              )}
            >
              PROFILE
            </Link>
          </nav>

          {/* Wallet Connect - Desktop */}
          <div className="hidden md:flex items-center gap-3">
            <WalletConnect variant="compact" />
          </div>

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-[hsl(var(--ethblox-surface))] px-6">
              <SheetHeader className="pt-2">
                <SheetTitle className="text-[hsl(var(--ethblox-yellow))]">Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4 mt-8">
                {/* Old BUILDER hidden - keeping route active for backwards compatibility */}
                <Link
                  href="/buildv2"
                  className={cn(
                    "text-base font-medium transition-colors",
                    isActive("/buildv2")
                      ? "text-[hsl(var(--ethblox-accent-cyan))]"
                      : "text-[hsl(var(--ethblox-text-secondary))] hover:text-[hsl(var(--ethblox-accent-cyan))]",
                  )}
                >
                  BUILD
                </Link>
                <Link
                  href="/explore"
                  className={cn(
                    "text-base font-medium transition-colors",
                    isActive("/explore")
                      ? "text-[hsl(var(--ethblox-accent-cyan))]"
                      : "text-[hsl(var(--ethblox-text-secondary))] hover:text-[hsl(var(--ethblox-accent-cyan))]",
                  )}
                >
                  EXPLORE
                </Link>
                <Link
                  href="/gallery"
                  className={cn(
                    "text-base font-medium transition-colors",
                    isActive("/gallery")
                      ? "text-[hsl(var(--ethblox-accent-cyan))]"
                      : "text-[hsl(var(--ethblox-text-secondary))] hover:text-[hsl(var(--ethblox-accent-cyan))]",
                  )}
                >
                  GALLERY
                </Link>
                <Link
                  href="/profile"
                  className={cn(
                    "text-base font-medium transition-colors",
                    pathname.startsWith("/profile") || pathname.startsWith("/u/")
                      ? "text-[hsl(var(--ethblox-accent-cyan))]"
                      : "text-[hsl(var(--ethblox-text-secondary))] hover:text-[hsl(var(--ethblox-accent-cyan))]",
                  )}
                >
                  PROFILE
                </Link>
                <div className="pt-4 mt-4 border-t border-[hsl(var(--ethblox-border))]">
                  <WalletConnect variant="default" />
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
