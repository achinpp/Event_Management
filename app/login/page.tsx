"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      window.location.href = "/admin";
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-50 text-zinc-900 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-100 px-6 py-12 antialiased">
      
      {/* Back to Home Link */}
      <div className="absolute top-6 left-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Home
        </Link>
      </div>

      {/* Floating Glowing Background Blobs */}
      <div className="absolute top-1/4 left-1/2 -z-10 h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[100px] dark:bg-violet-600/15 pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 -z-10 h-[280px] w-[280px] rounded-full bg-cyan-500/10 blur-[80px] dark:bg-cyan-500/15 pointer-events-none" />

      {/* Main Form Container */}
      <div className="w-full max-w-md">
        
        {/* Pulsing Status Badge */}
        <div className="mx-auto mb-6 flex max-w-fit items-center gap-2 rounded-full border border-violet-200/50 bg-violet-50/50 px-4 py-1.5 text-xs font-semibold text-violet-750 backdrop-blur-sm dark:border-violet-500/20 dark:bg-violet-900/10 dark:text-violet-300">
          <span className="flex h-2 w-2 items-center justify-center">
            <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-violet-400 opacity-75"></span>
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-500"></span>
          </span>
          Next-Gen AI Event Platform
        </div>

        {/* Logo & Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-600 border border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-400/20 mb-4 shadow-sm">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-650 bg-clip-text text-transparent dark:from-zinc-50 dark:to-zinc-300">
            Welcome to EventPilot
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Sign in to access the Orchestration Console
          </p>
        </div>

        {/* Form Card (Glassmorphic Styling) */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white/70 p-8 shadow-xl backdrop-blur-md transition-colors duration-300 dark:border-zinc-800/80 dark:bg-zinc-900/40">
          <form onSubmit={handleLogin} className="space-y-5">
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-zinc-200 bg-white/50 px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-zinc-200 bg-white/50 px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-550/10 border border-red-500/20 px-4 py-2 text-xs text-red-650 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative inline-flex h-11 w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-sm font-semibold text-white shadow-md shadow-indigo-600/10 transition-all hover:scale-[1.01] hover:shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Signing in..." : "Sign In to Dashboard"}
            </button>
          </form>
        </div>

        {/* Footer Link */}
        <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
