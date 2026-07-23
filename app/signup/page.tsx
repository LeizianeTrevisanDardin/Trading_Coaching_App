"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password) {
      alert("Please enter your email and password.");
      return;
    }

    if (password.length < 6) {
      alert("Your password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <section className="flex min-h-screen items-center justify-center bg-gray-950 p-6 text-white">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <h1 className="text-3xl font-bold">Create Account</h1>

        <input
          type="email"
          className="w-full rounded-xl border border-gray-700 bg-gray-800 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="w-full rounded-xl border border-gray-700 bg-gray-800 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="button"
          onClick={handleSignup}
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 p-3 font-bold transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>

        <p className="text-sm text-gray-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-blue-400 hover:text-blue-300"
          >
            Sign In
          </Link>
        </p>
      </div>
    </section>
  );
}