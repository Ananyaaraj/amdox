"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@amdox.com");
  const [password, setPassword] = useState("admin123");
  const [showPw, setShowPw] = useState(false);
  const { login, isLoading } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      // Set a cookie so middleware can verify auth
      document.cookie = "amdox-token=authenticated; path=/; max-age=604800; SameSite=Lax";
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Invalid credentials");
    }
  };

  const handleQuickLogin = async (eVal: string, pVal: string) => {
    setEmail(eVal);
    setPassword(pVal);
    try {
      await login(eVal, pVal);
      document.cookie = "amdox-token=authenticated; path=/; max-age=604800; SameSite=Lax";
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg mb-4">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Amdox ERP</h1>
          <p className="text-muted-foreground text-sm mt-1">Enterprise AI-Powered Cloud ERP</p>
        </div>

        <div className="bg-card border rounded-2xl shadow-lg p-8">
          <h2 className="text-xl font-semibold mb-6">Sign in to your account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              Sign in
            </button>
          </form>
          <div className="mt-6 pt-6 border-t space-y-3">
            <p className="text-[10px] font-bold text-muted-foreground text-center uppercase tracking-wider">Quick Demo Login</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin("admin@amdox.com", "admin123")}
                className="px-2 py-2.5 text-xs font-semibold border rounded-xl bg-background hover:bg-accent/40 text-center transition-all shadow-sm"
              >
                💼 System Head
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin("manager@amdox.com", "admin123")}
                className="px-2 py-2.5 text-xs font-semibold border rounded-xl bg-background hover:bg-accent/40 text-center transition-all shadow-sm"
              >
                📊 HR Manager
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin("employee@amdox.com", "admin123")}
                className="px-2 py-2.5 text-xs font-semibold border rounded-xl bg-background hover:bg-accent/40 text-center transition-all shadow-sm"
              >
                💻 Employee
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
