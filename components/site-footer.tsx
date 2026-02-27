"use client"

import type React from "react"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"

export function SiteFooter() {
  const [email, setEmail] = useState("")

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement newsletter subscription
    console.log("Subscribe:", email)
  }

  return (
    <footer className="relative border-t border-[hsl(var(--ethblox-border))] bg-[hsl(var(--ethblox-bg))]">
      {/* Floating particles background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-2 h-2 bg-[hsl(var(--ethblox-green))] rounded-full opacity-20 animate-float-up"
          style={{ left: "10%", animationDelay: "0s" }}
        />
        <div
          className="absolute w-2 h-2 bg-[hsl(var(--ethblox-yellow))] rounded-full opacity-20 animate-float-up"
          style={{ left: "30%", animationDelay: "2s" }}
        />
        <div
          className="absolute w-2 h-2 bg-[hsl(var(--ethblox-blue))] rounded-full opacity-20 animate-float-up"
          style={{ left: "50%", animationDelay: "4s" }}
        />
        <div
          className="absolute w-2 h-2 bg-[hsl(var(--ethblox-green))] rounded-full opacity-20 animate-float-up"
          style={{ left: "70%", animationDelay: "1s" }}
        />
        <div
          className="absolute w-2 h-2 bg-[hsl(var(--ethblox-yellow))] rounded-full opacity-20 animate-float-up"
          style={{ left: "90%", animationDelay: "3s" }}
        />
      </div>

      <div className="container mx-auto px-6 max-w-[1800px] relative z-10">
        {/* Newsletter Section */}
        <div className="py-12 border-b border-[hsl(var(--ethblox-border))]">
          <div className="max-w-md mx-auto text-center">
            <h3 className="text-2xl font-heading font-bold text-[hsl(var(--ethblox-yellow))] mb-2">Stay Updated</h3>
            <p className="text-sm text-[hsl(var(--ethblox-text-secondary))] mb-6">
              Get notified about releases, upgrades, and builder events.
            </p>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <Input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))] text-[hsl(var(--ethblox-text-primary))]"
              />
              <Button
                type="submit"
                className="bg-[hsl(var(--ethblox-green))] text-[hsl(var(--ethblox-bg))] hover:bg-[hsl(var(--ethblox-green))]/90"
              >
                Subscribe
              </Button>
            </form>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 relative">
                <Image
                  src="/yellow-geometric-cube-logo.jpg"
                  alt="BASEBLOX"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <span className="text-xl font-heading font-bold text-[hsl(var(--ethblox-yellow))]">BASEBLOX</span>
            </Link>
            <p className="text-sm text-[hsl(var(--ethblox-text-secondary))] mb-4">
              Programmable matter for Ethereum's next cultural era.
            </p>
            <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))]">© 2025 BASEBLOX. All rights reserved.</p>
          </div>

          {/* Protocol Column */}
          <div>
            <h4 className="text-sm font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-4">Protocol</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/whitepaper"
                  className="text-sm text-[hsl(var(--ethblox-text-secondary))] hover:text-[hsl(var(--ethblox-accent-cyan))] transition-colors"
                >
                  Overview
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-[hsl(var(--ethblox-text-secondary))] hover:text-[hsl(var(--ethblox-accent-cyan))] transition-colors"
                >
                  BLOX
                </Link>
              </li>
              <li>
                <Link
                  href="/bricks"
                  className="text-sm text-[hsl(var(--ethblox-text-secondary))] hover:text-[hsl(var(--ethblox-accent-cyan))] transition-colors"
                >
                  BRICKS
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-[hsl(var(--ethblox-text-secondary))] hover:text-[hsl(var(--ethblox-accent-cyan))] transition-colors"
                >
                  BUILDS
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-[hsl(var(--ethblox-text-secondary))] hover:text-[hsl(var(--ethblox-accent-cyan))] transition-colors"
                >
                  BW Score
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-[hsl(var(--ethblox-text-secondary))] hover:text-[hsl(var(--ethblox-accent-cyan))] transition-colors"
                >
                  Economy
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Column */}
          <div>
            <h4 className="text-sm font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/docs"
                  className="text-sm text-[hsl(var(--ethblox-text-secondary))] hover:text-[hsl(var(--ethblox-accent-cyan))] transition-colors"
                >
                  Docs
                </Link>
              </li>
              <li>
                <Link
                  href="/whitepaper"
                  className="text-sm text-[hsl(var(--ethblox-text-secondary))] hover:text-[hsl(var(--ethblox-accent-cyan))] transition-colors"
                >
                  Whitepaper
                </Link>
              </li>
              <li>
                <Link
                  href="/curve-guides"
                  className="text-sm text-[hsl(var(--ethblox-text-secondary))] hover:text-[hsl(var(--ethblox-accent-cyan))] transition-colors"
                >
                  Curve Guides
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-[hsl(var(--ethblox-text-secondary))] hover:text-[hsl(var(--ethblox-accent-cyan))] transition-colors"
                >
                  API
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-[hsl(var(--ethblox-text-secondary))] hover:text-[hsl(var(--ethblox-accent-cyan))] transition-colors"
                >
                  GitHub
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-[hsl(var(--ethblox-text-secondary))] hover:text-[hsl(var(--ethblox-accent-cyan))] transition-colors"
                >
                  Brand Assets
                </Link>
              </li>
            </ul>
          </div>

          {/* Community Column */}
          <div>
            <h4 className="text-sm font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-4">Community</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="#"
                  className="text-sm text-[hsl(var(--ethblox-text-secondary))] hover:text-[hsl(var(--ethblox-accent-cyan))] transition-colors"
                >
                  Twitter
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-[hsl(var(--ethblox-text-secondary))] hover:text-[hsl(var(--ethblox-accent-cyan))] transition-colors"
                >
                  Discord
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-[hsl(var(--ethblox-text-secondary))] hover:text-[hsl(var(--ethblox-accent-cyan))] transition-colors"
                >
                  Farcaster
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-[hsl(var(--ethblox-text-secondary))] hover:text-[hsl(var(--ethblox-accent-cyan))] transition-colors"
                >
                  Governance
                </Link>
              </li>
            </ul>
          </div>

          {/* Explore + Legal Column */}
          <div>
            <h4 className="text-sm font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-4">Explore</h4>
            <ul className="space-y-2 mb-6">
              <li>
                <Link
                  href="/bricks"
                  className="text-sm text-[hsl(var(--ethblox-text-secondary))] hover:text-[hsl(var(--ethblox-accent-cyan))] transition-colors"
                >
                  Genesis BRICKS
                </Link>
              </li>
              <li>
                <Link
                  href="/gallery"
                  className="text-sm text-[hsl(var(--ethblox-text-secondary))] hover:text-[hsl(var(--ethblox-accent-cyan))] transition-colors"
                >
                  Featured Builds
                </Link>
              </li>
            </ul>
            <h4 className="text-sm font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="#"
                  className="text-sm text-[hsl(var(--ethblox-text-secondary))] hover:text-[hsl(var(--ethblox-accent-cyan))] transition-colors"
                >
                  Terms
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-[hsl(var(--ethblox-text-secondary))] hover:text-[hsl(var(--ethblox-accent-cyan))] transition-colors"
                >
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-[hsl(var(--ethblox-border))] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-[hsl(var(--ethblox-text-tertiary))]">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z" />
            </svg>
            <span>Built on Ethereum</span>
          </div>
          <div className="text-sm text-[hsl(var(--ethblox-text-tertiary))]">
            <Link href="#" className="hover:text-[hsl(var(--ethblox-accent-cyan))] transition-colors">
              View on Etherscan
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
