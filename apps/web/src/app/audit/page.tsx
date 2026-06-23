"use client";
import { useQuery } from "@tanstack/react-query";
import { Shield, CheckCircle, AlertTriangle } from "lucide-react";
import { apiGet } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, Table, Spinner, StatCard } from "@/components/ui";

export default function AuditPage() {
  const { data: logs, isLoading } = useQuery({ queryKey: ["audit-logs"], queryFn: () => apiGet<any>("/audit/logs") });
  const { data: integrity } = useQuery({ queryKey: ["audit-integrity"], queryFn: () => apiGet<any>("/audit/integrity") });

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Audit Log</h1><p className="text-sm text-muted-foreground">Immutable audit trail with hash-chain integrity</p></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Entries" value={integrity?.total || 0} icon={<Shield className="w-4 h-4"/>}/>
        <StatCard title="Integrity" value={integrity?.isIntact ? "✓ Intact" : "⚠ Tampered"} icon={integrity?.isIntact ? <CheckCircle className="w-4 h-4"/> : <AlertTriangle className="w-4 h-4"/>} className={integrity?.isIntact ? "" : "border-red-200"}/>
        <StatCard title="Tampered" value={integrity?.tampered || 0}/>
        <StatCard title="Log Pages" value={logs?.pages || 0}/>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Resource</th><th>IP</th></tr></thead>
            <tbody>
              {logs?.logs?.map((l:any) => (
                <tr key={l.id}>
                  <td className="text-xs text-muted-foreground">{formatDate(l.createdAt, "long")}</td>
                  <td className="font-mono text-xs">{l.userId?.slice(0,8) || "system"}…</td>
                  <td><span className={`px-1.5 py-0.5 rounded text-xs font-mono ${l.action==="DELETE"?"bg-red-50 text-red-600":l.action==="POST"?"bg-green-50 text-green-600":"bg-blue-50 text-blue-600"}`}>{l.action}</span></td>
                  <td className="text-sm">{l.resource}</td>
                  <td className="font-mono text-xs text-muted-foreground">{l.ipAddress || "—"}</td>
                </tr>
              ))}
              {!logs?.logs?.length && <tr><td colSpan={5} className="text-center text-muted-foreground py-8">No audit log entries yet.</td></tr>}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
