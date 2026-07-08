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
      alert("Preencha email e senha.");
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
    <section className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <h1 className="text-3xl font-bold">Login</h1>

        <input
          className="w-full p-3 rounded bg-gray-800"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full p-3 rounded bg-gray-800"
          placeholder="Senha"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl p-3 font-bold"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <p className="text-gray-400 text-sm">
          Não tem conta?{" "}
          <Link href="/signup" className="text-blue-400">
            Criar conta
          </Link>
        </p>
      </div>
    </section>
  );
}