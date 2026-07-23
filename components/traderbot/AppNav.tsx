"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/traderbot", label: "Trade Planner" },
  { href: "/traderbot/screenshot-analysis", label: "Screenshot AI" },
  { href: "/playbook", label: "Playbook" },
  { href: "/analytics", label: "Analytics" },
  { href: "/journal", label: "Journal" },
  { href: "/settings", label: "Settings" },
];

export default function AppNav() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<any>(null);

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

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert(error.message);
      return;
    }

    router.replace("/login");
    router.refresh();
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-4">
        {/* Logo */}
        <Link
          href={user ? "/dashboard" : "/"}
          aria-label="TraderBot AI Home"
          className="flex items-center gap-3 transition hover:opacity-90"
        >
          <span className="text-3xl">🤖</span>

          <h1 className="text-3xl font-bold text-white transition hover:text-blue-400">
            TraderBot AI
          </h1>
        </Link>

        {/* Navigation */}
        <div className="flex items-center gap-6">
          {user &&
            links.map((link) => {
              const active = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition ${
                    active
                      ? "font-semibold text-blue-400"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

          {!user ? (
            <>
              <Link
                href="/login"
                className="text-slate-300 transition hover:text-white"
              >
                Login
              </Link>

              <Link
                href="/signup"
                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
              >
                Sign Up
              </Link>
            </>
          ) : (
            <>
              <span className="text-sm text-slate-400">
                {user.email}
              </span>

              <button
                onClick={handleLogout}
                className="rounded-lg bg-red-600 px-4 py-2 text-white transition hover:bg-red-700"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}