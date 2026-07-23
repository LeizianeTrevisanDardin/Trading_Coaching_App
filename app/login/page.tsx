"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter your email and password.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/traderbot/screenshot-analysis");
  };

  return (
    <section className="flex min-h-screen items-center justify-center bg-gray-950 p-6 text-white">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <h1 className="text-3xl font-bold">Sign In</h1>

        <input
          className="w-full rounded-xl bg-gray-800 p-3"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full rounded-xl bg-gray-800 p-3"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 p-3 font-bold transition hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Signing In..." : "Sign In"}
        </button>

        <p className="text-sm text-gray-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-blue-400 hover:text-blue-300"
          >
            Create an account
          </Link>
        </p>
      </div>
    </section>
  );
}