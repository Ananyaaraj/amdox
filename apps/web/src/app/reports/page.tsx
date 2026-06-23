"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  FileText, FileSpreadsheet, Download, TrendingUp,
  Users, Package, FolderKanban, Loader2, CheckCircle,
} from "lucide-react";
import { apiGet, api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, Spinner } from "@/components/ui";

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

type Module = "finance" | "hr" | "inventory" | "projects";
type Format = "pdf" | "excel";
type DownloadState = "idle" | "loading" | "done";

const MODULES: { id: Module; label: string; icon: React.ReactNode; description: string }[] = [
  { id: "finance",   label: "Finance",           icon: <TrendingUp className="w-5 h-5" />,     description: "Invoices, journal entries & chart of accounts" },
  { id: "hr",        label: "HR & Payroll",       icon: <Users className="w-5 h-5" />,          description: "Employees, departments & leave requests" },
  { id: "inventory", label: "Inventory & Supply", icon: <Package className="w-5 h-5" />,        description: "Products, purchase orders & vendors" },
  { id: "projects",  label: "Projects",           icon: <FolderKanban className="w-5 h-5" />,   description: "Budget, tasks & completion status" },
];

export default function ReportsPage() {
  // Download state per (module, format)
  const [dlState, setDlState] = useState<Record<string, DownloadState>>({});

  const { data: kpis, isLoading } = useQuery({
    queryKey: ["bi-kpis"],
    queryFn: () => apiGet<any>("/bi/kpis"),
  });
  const { data: revenue } = useQuery({
    queryKey: ["revenue-trend"],
    queryFn: () => apiGet<any[]>("/bi/revenue-trend"),
  });
  const { data: inventory } = useQuery({
    queryKey: ["inventory-summary"],
    queryFn: () => apiGet<any[]>("/bi/inventory-summary"),
  });
  const { data: projects } = useQuery({
    queryKey: ["project-health"],
    queryFn: () => apiGet<any[]>("/bi/project-health"),
  });

  const revenueData =
    revenue?.map((r: any) => ({
      month: new Date(r.month).toLocaleString("default", { month: "short" }),
      revenue: Number(r.revenue || 0),
    })) || [];

  async function handleDownload(module: Module, format: Format) {
    const key = `${module}-${format}`;
    setDlState((prev) => ({ ...prev, [key]: "loading" }));
    try {
      const response = await api.get(`/reports/${module}/${format}`, {
        responseType: "blob",
      });

      const mimeType =
        format === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const ext = format === "pdf" ? "pdf" : "xlsx";
      const date = new Date().toISOString().slice(0, 10);
      const filename = `${module}_report_${date}.${ext}`;

      const url = window.URL.createObjectURL(new Blob([response.data], { type: mimeType }));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setDlState((prev) => ({ ...prev, [key]: "done" }));
      setTimeout(() => setDlState((prev) => ({ ...prev, [key]: "idle" })), 2500);
    } catch (err) {
      console.error("Download failed", err);
      setDlState((prev) => ({ ...prev, [key]: "idle" }));
    }
  }

  function DownloadButton({
    module,
    format,
  }: {
    module: Module;
    format: Format;
  }) {
    const key = `${module}-${format}`;
    const state = dlState[key] ?? "idle";
    const isPdf = format === "pdf";

    return (
      <button
        onClick={() => handleDownload(module, format)}
        disabled={state === "loading"}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
          ${state === "done"
            ? "bg-green-50 text-green-700 border border-green-200"
            : isPdf
            ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
            : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
          }
          disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {state === "loading" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : state === "done" ? (
          <CheckCircle className="w-3.5 h-3.5" />
        ) : isPdf ? (
          <FileText className="w-3.5 h-3.5" />
        ) : (
          <FileSpreadsheet className="w-3.5 h-3.5" />
        )}
        {state === "done" ? "Downloaded!" : state === "loading" ? "Generating…" : isPdf ? "PDF" : "Excel"}
      </button>
    );
  }

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">BI & Reports</h1>
          <p className="text-sm text-muted-foreground">
            Analytics dashboards and downloadable reports
          </p>
        </div>
      </div>

      {/* ── Download Cards ─────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Download Reports
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {MODULES.map((mod) => (
            <Card key={mod.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-center gap-2 text-primary">
                {mod.icon}
                <span className="font-semibold text-sm">{mod.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{mod.description}</p>
              <div className="flex gap-2 mt-auto">
                <DownloadButton module={mod.id} format="pdf" />
                <DownloadButton module={mod.id} format="excel" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ── KPI strip ─────────────────────────────────────────────────────── */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Employees", value: kpis.employees },
            { label: "Active Projects", value: kpis.activeProjects },
            { label: "Open POs", value: kpis.openPOs },
            { label: "Accounts Receivable", value: formatCurrency(kpis.accountsReceivable) },
            { label: "Accounts Payable", value: formatCurrency(kpis.accountsPayable) },
          ].map((k) => (
            <Card key={k.label} className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-xl font-bold text-primary mt-1">{k.value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* ── Charts ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {inventory?.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={inventory}
                    dataKey="total_value"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {inventory.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex items-center justify-center text-muted-foreground text-sm">
                No data
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Project Budget vs Actual</CardTitle>
          </CardHeader>
          <CardContent>
            {projects?.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={projects} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  <Bar dataKey="budget" fill="#3b82f6" name="Budget" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="actualCost" fill="#f59e0b" name="Actual" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex items-center justify-center text-muted-foreground text-sm">
                No project data
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
