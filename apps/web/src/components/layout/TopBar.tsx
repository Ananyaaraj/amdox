"use client";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Search, Sun, Moon, Check, AlertTriangle, AlertCircle, Info, CheckCheck } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuthStore } from "@/store/auth.store";
import { getInitials, formatDate } from "@/lib/utils";
import { apiGet, apiPatch } from "@/lib/api";
import toast from "react-hot-toast";

function getNotifIcon(type: string) {
  switch (type) {
    case "SUCCESS":
      return <Check className="w-5 h-5 text-green-600 bg-green-50 rounded-lg p-1 shrink-0" />;
    case "WARNING":
      return <AlertTriangle className="w-5 h-5 text-yellow-600 bg-yellow-50 rounded-lg p-1 shrink-0" />;
    case "ERROR":
      return <AlertCircle className="w-5 h-5 text-red-600 bg-red-50 rounded-lg p-1 shrink-0" />;
    default:
      return <Info className="w-5 h-5 text-blue-600 bg-blue-50 rounded-lg p-1 shrink-0" />;
  }
}

export function TopBar() {
  const { user } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiGet<any[]>("/notifications"),
    refetchInterval: 10000,
    enabled: !!user,
  });

  const { data: unreadData } = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: () => apiGet<any>("/notifications/unread-count"),
    refetchInterval: 10000,
    enabled: !!user,
  });

  const unreadCount = typeof unreadData === "number" ? unreadData : Number(unreadData?.count) || 0;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiPatch(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiPatch("/notifications/read-all"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      toast.success("All notifications marked as read");
    },
  });

  return (
    <header className="h-16 border-b bg-card flex items-center gap-4 px-6 shrink-0 relative z-30">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search anything..."
          className="w-full pl-9 pr-4 py-2 text-sm bg-muted/50 border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={containerRef}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)} 
            className="relative p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full animate-pulse" />
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-card border rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="p-3 border-b flex items-center justify-between bg-muted/30">
                <span className="text-sm font-semibold flex items-center gap-1.5">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 text-xxs font-bold bg-destructive text-destructive-foreground rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </span>
                {unreadCount > 0 && (
                  <button 
                    onClick={() => markAllReadMutation.mutate()}
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    <CheckCheck className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y">
                {notifications && notifications.length > 0 ? (
                  notifications.map((n: any) => (
                    <div 
                      key={n.id} 
                      onClick={() => !n.read && markReadMutation.mutate(n.id)}
                      className={`p-3 text-left transition-colors cursor-pointer hover:bg-accent/40 flex gap-2.5 items-start ${!n.read ? "bg-primary/5 font-medium" : ""}`}
                    >
                      {getNotifIcon(n.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">{n.title}</p>
                        <p className="text-xxs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-muted-foreground/80 mt-1">{formatDate(n.createdAt, "relative")}</p>
                      </div>
                      {!n.read && (
                        <span className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 shrink-0" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No notifications yet
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-2 pl-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
            {user ? getInitials(user.name) : "?"}
          </div>
          <div className="hidden sm:block text-sm">
            <p className="font-medium leading-none">{user?.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
