"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/traderbot", label: "Trade Planner" },
  {
    href: "/traderbot/screenshot-analysis",
    label: "Screenshot AI",
  },
  { href: "/playbook", label: "Playbook" },
  { href: "/analytics", label: "Analytics" },
  { href: "/journal", label: "Journal" },
  { href: "/settings", label: "Settings" },
];

export default function AppNav() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert(error.message);
      return;
    }

    setMenuOpen(false);
    router.replace("/login");
    router.refresh();
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href={user ? "/dashboard" : "/"}
            aria-label="TraderBot AI Home"
            className="flex min-w-0 items-center gap-2 transition hover:opacity-90"
          >
            <span className="shrink-0 text-2xl sm:text-3xl">
              🤖
            </span>

            <h1 className="leading-tight font-bold text-white transition hover:text-blue-400">
              <span className="block text-lg sm:hidden">
                TraderBot
              </span>

              <span className="hidden text-2xl sm:block">
                TraderBot AI
              </span>
            </h1>
          </Link>

          {/* Desktop navigation */}
          <div className="hidden items-center gap-4 lg:flex">
            {user &&
              links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`whitespace-nowrap text-sm transition ${
                    isActive(link.href)
                      ? "font-semibold text-blue-400"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))}

            {!user ? (
              <>
                <Link
                  href="/login"
                  className="text-sm text-slate-300 transition hover:text-white"
                >
                  Login
                </Link>

                <Link
                  href="/signup"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                <span
                  className="max-w-40 truncate text-sm text-slate-400"
                  title={user.email}
                >
                  {user.email}
                </span>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition hover:bg-red-700"
                >
                  Logout
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-200 transition hover:bg-slate-800 lg:hidden"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile navigation */}
        {menuOpen && (
          <div className="border-t border-slate-800 py-4 lg:hidden">
            <div className="flex flex-col gap-2">
              {user &&
                links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-lg px-3 py-3 text-sm transition ${
                      isActive(link.href)
                        ? "bg-blue-600/15 font-semibold text-blue-400"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}

              {!user ? (
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <Link
                    href="/login"
                    className="rounded-lg border border-slate-700 px-4 py-3 text-center text-sm text-slate-200 transition hover:bg-slate-800"
                  >
                    Login
                  </Link>

                  <Link
                    href="/signup"
                    className="rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Sign Up
                  </Link>
                </div>
              ) : (
                <div className="mt-3 border-t border-slate-800 pt-4">
                  <p className="mb-3 truncate px-3 text-sm text-slate-400">
                    {user.email}
                  </p>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}