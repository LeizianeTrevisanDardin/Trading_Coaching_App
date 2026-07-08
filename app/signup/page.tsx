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
      alert("Preencha email e senha.");
      return;
    }

    if (password.length < 6) {
      alert("A senha precisa ter pelo menos 6 caracteres.");
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

    alert("Conta criada! Agora faça login.");
    router.push("/login");
  };

  return (
    <section className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <h1 className="text-3xl font-bold">Criar conta</h1>

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
          onClick={handleSignup}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl p-3 font-bold"
        >
          {loading ? "Criando..." : "Criar conta"}
        </button>

        <p className="text-gray-400 text-sm">
          Já tem conta?{" "}
          <Link href="/login" className="text-blue-400">
            Entrar
          </Link>
        </p>
      </div>
    </section>
  );
}