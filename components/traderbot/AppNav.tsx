"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import {
  Menu,
  Newspaper,
  RefreshCw,
  X,
} from "lucide-react";

const links = [
  {
    href: "/dashboard",
    label: "Dashboard",
  },
  {
    href: "/market-news",
    label: "Market News",
  },
  {
    href: "/trader-planner",
    label: "Trade Planner",
  },
  {
    href: "/traderbot/screenshot-analysis",
    label: "Screenshot AI",
  },
  {
    href: "/playbook",
    label: "Playbook",
  },
  {
    href: "/analytics",
    label: "Analytics",
  },
  {
    href: "/journal",
    label: "Journal",
  },
  {
    href: "/settings",
    label: "Settings",
  },
];

export default function AppNav() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let componentMounted = true;

    const loadSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error(
            "Unable to load Supabase session:",
            error.message
          );
        }

        if (!componentMounted) {
          return;
        }

        setUser(session?.user ?? null);
      } catch (error) {
        console.error(
          "Unexpected authentication error:",
          error
        );

        if (componentMounted) {
          setUser(null);
        }
      } finally {
        if (componentMounted) {
          setAuthLoading(false);
        }
      }
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!componentMounted) {
          return;
        }

        setUser(session?.user ?? null);
        setAuthLoading(false);

        if (event === "SIGNED_OUT") {
          setMenuOpen(false);
        }

        if (
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED"
        ) {
          router.refresh();
        }
      }
    );

    return () => {
      componentMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    try {
      setLoggingOut(true);

      const { error } = await supabase.auth.signOut({
        scope: "local",
      });

      if (error) {
        alert(error.message);
        return;
      }

      setUser(null);
      setMenuOpen(false);

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);

      alert(
        "Unable to log out. Please try again."
      );
    } finally {
      setLoggingOut(false);
    }
  };

  const isActive = (href: string): boolean => {
    if (
      href === "/dashboard" ||
      href === "/trader-planner" ||
      href === "/market-news"
    ) {
      return pathname === href;
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
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
            {authLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <RefreshCw className="h-4 w-4 animate-spin" />

                <span>Checking session...</span>
              </div>
            ) : null}

            {!authLoading &&
              user &&
              links.map((link) => {
                const active = isActive(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={
                      active ? "page" : undefined
                    }
                    className={`whitespace-nowrap text-sm transition ${
                      active
                        ? "font-semibold text-blue-400"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}

            {!authLoading && !user ? (
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
            ) : null}

            {!authLoading && user ? (
              <>
                <span
                  className="max-w-40 truncate text-sm text-slate-400"
                  title={user.email ?? ""}
                >
                  {user.email}
                </span>

                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  disabled={loggingOut}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loggingOut
                    ? "Logging out..."
                    : "Logout"}
                </button>
              </>
            ) : null}
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() =>
              setMenuOpen((current) => !current)
            }
            aria-label={
              menuOpen ? "Close menu" : "Open menu"
            }
            aria-expanded={menuOpen}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-200 transition hover:bg-slate-800 lg:hidden"
          >
            {menuOpen ? (
              <X size={22} />
            ) : (
              <Menu size={22} />
            )}
          </button>
        </div>

        {/* Mobile navigation */}
        {menuOpen ? (
          <div className="border-t border-slate-800 py-4 lg:hidden">
            <div className="flex flex-col gap-2">
              {authLoading ? (
                <div className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm text-slate-400">
                  <RefreshCw className="h-4 w-4 animate-spin" />

                  <span>Checking session...</span>
                </div>
              ) : null}

              {!authLoading &&
                user &&
                links.map((link) => {
                  const active = isActive(
                    link.href
                  );

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={
                        active ? "page" : undefined
                      }
                      className={`rounded-lg px-3 py-3 text-sm transition ${
                        active
                          ? "bg-blue-600/15 font-semibold text-blue-400"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {link.href ===
                        "/market-news" ? (
                          <Newspaper className="h-4 w-4" />
                        ) : null}

                        {link.label}
                      </span>
                    </Link>
                  );
                })}

              {!authLoading && !user ? (
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
              ) : null}

              {!authLoading && user ? (
                <div className="mt-3 border-t border-slate-800 pt-4">
                  <p className="mb-3 truncate px-3 text-sm text-slate-400">
                    {user.email}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      void handleLogout()
                    }
                    disabled={loggingOut}
                    className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loggingOut
                      ? "Logging out..."
                      : "Logout"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  );
}