"use client";

import { signIn, getSession } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SprayCan } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setLoading(false);
      setError("Invalid email or password.");
      return;
    }

    // Read the session to get the role and redirect accordingly
    const session = await getSession();
    const role = (session?.user as any)?.role;

    if (role === "CLEANER") window.location.href = "/cleaner";
    else if (role === "CLIENT") window.location.href = "/client/bookings";
    else window.location.href = "/admin";
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg">
            <SprayCan className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">CleanPro</h1>
          <p className="text-sm text-gray-500">Sign in to your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@company.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button type="submit" className="w-full" loading={loading}>
            Sign in
          </Button>
        </form>

      </div>
    </div>
  );
}
