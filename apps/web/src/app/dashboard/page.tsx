"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { DollarSign, Users, Package, FolderKanban, TrendingUp, AlertTriangle, Briefcase, Calendar, CheckSquare } from "lucide-react";
import { apiGet, apiPut } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { StatCard, Card, CardHeader, CardTitle, CardContent, Spinner, Badge } from "@/components/ui";
import { useAuthStore } from "@/store/auth.store";
import toast from "react-hot-toast";

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isEmployee = user?.role === "VIEWER";
  const qc = useQueryClient();

  // Head/Manager queries
  const { data: kpis, isLoading: kpiLoading } = useQuery({
    queryKey: ["bi-kpis"],
    queryFn: () => apiGet<any>("/bi/kpis"),
    enabled: !isEmployee,
  });

  const { data: revenueTrend } = useQuery({
    queryKey: ["revenue-trend"],
    queryFn: () => apiGet<any[]>("/bi/revenue-trend"),
    enabled: !isEmployee,
  });

  const { data: projectHealth } = useQuery({
    queryKey: ["project-health"],
    queryFn: () => apiGet<any[]>("/bi/project-health"),
    enabled: !isEmployee,
  });

  const { data: inventorySummary } = useQuery({
    queryKey: ["inventory-summary"],
    queryFn: () => apiGet<any[]>("/bi/inventory-summary"),
    enabled: !isEmployee,
  });

  // Employee queries
  const { data: employees, isLoading: empLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => apiGet<any[]>("/hr/employees"),
    enabled: isEmployee,
  });

  const { data: leaves } = useQuery({
    queryKey: ["leaves"],
    queryFn: () => apiGet<any[]>("/hr/leaves"),
    enabled: isEmployee,
  });

  const { data: myTasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ["my-tasks"],
    queryFn: () => apiGet<any[]>("/projects/tasks/my"),
    enabled: isEmployee,
  });

  const myEmployee = employees?.find((e: any) => e.email === user?.email);

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, payload }: { taskId: string; payload: any }) => apiPut(`/projects/tasks/${taskId}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-tasks"] });
      toast.success("Task status updated!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update task status");
    },
  });

  const handleUpdateTaskStatus = (taskId: string, newStatus: string) => {
    updateTaskMutation.mutate({ taskId, payload: { status: newStatus } });
  };

  if (isEmployee ? (empLoading || tasksLoading) : kpiLoading) return <Spinner />;

  const myLeaves = leaves?.filter((l: any) => l.employeeId === myEmployee?.id) || [];
  const myTasks = myTasksData || [];
  const pendingLeaves = myLeaves.filter((l: any) => l.status === "PENDING").length;

  if (isEmployee) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <div>
            <h1 className="page-title">Employee Workspace</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {user?.name}!</p>
          </div>
          <span className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </span>
        </div>

        {/* Employee details cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Department" value={myEmployee?.department?.name || "Engineering"} icon={<Briefcase className="w-4 h-4" />} />
          <StatCard title="Job Title" value={myEmployee?.jobTitle || "Senior Engineer"} icon={<Users className="w-4 h-4" />} />
          <StatCard title="Monthly Salary" value={myEmployee ? formatCurrency(myEmployee.baseSalary, myEmployee.currency) : "—"} icon={<DollarSign className="w-4 h-4" />} />
          <StatCard title="Pending Leave Requests" value={pendingLeaves} icon={<Calendar className="w-4 h-4" />} className={pendingLeaves > 0 ? "border-yellow-200" : ""} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* My tasks list */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-primary" /> My Assigned Tasks ({myTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-left text-xs font-semibold text-muted-foreground">
                    <th className="p-3">Task Title</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {myTasks.map((t: any) => (
                    <tr key={t.id} className="hover:bg-accent/10 transition-colors">
                      <td className="p-3">
                        <span className={t.status === "DONE" ? "line-through text-muted-foreground" : "font-medium"}>{t.title}</span>
                      </td>
                      <td className="p-3"><Badge status={t.priority} label={t.priority} /></td>
                      <td className="p-3 text-right">
                        <select
                          value={t.status}
                          onChange={(e) => handleUpdateTaskStatus(t.id, e.target.value)}
                          className="px-2 py-1 text-xs border rounded-lg outline-none bg-background focus:ring-2 focus:ring-primary/30"
                        >
                          <option value="TODO">To Do</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="IN_REVIEW">In Review</option>
                          <option value="DONE">Done</option>
                          <option value="BLOCKED">Blocked</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {myTasks.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center text-muted-foreground py-8">
                        No tasks assigned to you.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* My leaves list */}
          <Card>
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" /> My Recent Leaves
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-left text-xs font-semibold text-muted-foreground">
                    <th className="p-3">Type</th>
                    <th className="p-3">Dates</th>
                    <th className="p-3">Days</th>
                    <th className="p-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {myLeaves.slice(0, 5).map((l: any) => (
                    <tr key={l.id} className="hover:bg-accent/10 transition-colors">
                      <td className="p-3 font-medium">{l.leaveType}</td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}
                      </td>
                      <td className="p-3 font-semibold">{Number(l.days)}</td>
                      <td className="p-3 text-right"><Badge status={l.status} /></td>
                    </tr>
                  ))}
                  {myLeaves.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-muted-foreground py-8">
                        No leave history found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Head/Manager Dashboard View
  const revenueData = revenueTrend?.map((r: any) => ({
    month: new Date(r.month).toLocaleString("default", { month: "short" }),
    revenue: Number(r.revenue || 0),
  })) || [];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Executive Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time overview of your enterprise</p>
        </div>
        <span className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Accounts Receivable"
          value={formatCurrency(kpis?.accountsReceivable || 0)}
          change="vs last month"
          positive
          icon={<DollarSign className="w-4 h-4" />}
        />
        <StatCard
          title="Active Employees"
          value={formatNumber(kpis?.employees || 0)}
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          title="Active Projects"
          value={kpis?.activeProjects || 0}
          icon={<FolderKanban className="w-4 h-4" />}
        />
        <StatCard
          title="Open POs"
          value={kpis?.openPOs || 0}
          icon={<Package className="w-4 h-4" />}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Revenue Trend (12 months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Inventory by Category */}
        <Card>
          <CardHeader><CardTitle>Inventory Value</CardTitle></CardHeader>
          <CardContent>
            {inventorySummary?.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={inventorySummary}
                    dataKey="total_value"
                    nameKey="category"
                    cx="50%" cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {inventorySummary.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex items-center justify-center text-muted-foreground text-sm">No inventory data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" /> Active Projects Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          {projectHealth?.length ? (
            <div className="space-y-3">
              {projectHealth.map((p: any) => (
                <div key={p.id} className="flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">{p.name}</span>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        <span className="text-xs text-muted-foreground">{p.completion.toFixed(0)}% done</span>
                        <Badge status={p.budgetUsed > 100 ? "OVERDUE" : p.status} label={p.budgetUsed > 100 ? "Over Budget" : p.status} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(p.completion, 100)}%` }} />
                      </div>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${p.budgetUsed > 100 ? "bg-destructive" : "bg-green-500"}`}
                          style={{ width: `${Math.min(p.budgetUsed, 100)}%` }} />
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                      <span>Progress</span>
                      <span>Budget ({p.budgetUsed.toFixed(0)}%)</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No active projects</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
