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
    <nav className="bg-slate-950 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
        <Link
          href="/dashboard"
          className="text-2xl font-bold text-white hover:text-blue-400 transition"
        >
          🤖 TraderBot AI
        </Link>

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
                      ? "text-blue-400 font-semibold"
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
                className="text-slate-300 hover:text-white"
              >
                Login
              </Link>

              <Link
                href="/signup"
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white font-semibold"
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
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-white transition"
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