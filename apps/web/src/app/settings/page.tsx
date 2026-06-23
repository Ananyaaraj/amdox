"use client";
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from "@/components/ui";
import { useAuthStore } from "@/store/auth.store";

export default function SettingsPage() {
  const { user } = useAuthStore();
  return (
    <div className="space-y-6 max-w-2xl">
      <div><h1 className="page-title">Settings</h1><p className="text-sm text-muted-foreground">Tenant configuration and user preferences</p></div>
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input label="Full Name" defaultValue={user?.name} />
          <Input label="Email" defaultValue={user?.email} type="email" />
          <Input label="Role" defaultValue={user?.role} disabled />
          <Button>Save Changes</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Security</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input label="Current Password" type="password" placeholder="••••••••" />
          <Input label="New Password" type="password" placeholder="••••••••" />
          <Button variant="outline">Change Password</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Tenant Info</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tenant ID</span><span className="font-mono">{user?.tenantId}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Plan</span><span>Enterprise</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">SLA</span><span className="text-green-600">99.9% Uptime Target</span></div>
        </CardContent>
      </Card>
    </div>
  );
}
