
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GraduationCap, Lock, Mail } from "lucide-react";

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const result = await login(email.trim(), password);

    if (!result.success) {
      setError(result.message || "Unable to sign in. Please try again.");
      return;
    }

    navigate("/dashboard", { replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <GraduationCap size={35} />
          </div>

          <h1 className="text-2xl font-bold text-slate-800">
            School Management
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Sign in to access your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email address
            </label>

            <div className="flex items-center rounded-lg border border-slate-300 px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
              <Mail size={18} className="text-slate-400" />

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={loading}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="Enter your email"
                className="w-full bg-transparent p-3 text-slate-800 outline-none disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Password
            </label>

            <div className="flex items-center rounded-lg border border-slate-300 px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
              <Lock size={18} className="text-slate-400" />

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={loading}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="Enter your password"
                className="w-full bg-transparent p-3 text-slate-800 outline-none disabled:opacity-60"
              />
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-600"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-slate-400">
          School Management System
        </p>
      </section>
    </main>
  );
}
