import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  Building2,
  Flag,
  History,
  LayoutDashboard,
  MapPin,
  Settings,
  Share2,
  ShieldCheck,
  Target,
  Users,
  X,
} from "lucide-react";
import type { ComponentType } from "react";

import { currentAdmin } from "../data/session";
import { useAdminData } from "../state/AdminDataContext";

type NavItem = {
  label: string;
  to?: string;
  icon: ComponentType<{ className?: string }>;
  badge?: number;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

function useNavSections(): NavSection[] {
  const { people } = useAdminData();

  const attentionCount = people.filter(
    (person) =>
      person.admin.verificationStatus === "pending" ||
      person.admin.verificationStatus === "needs_changes",
  ).length;

  return [
    {
      label: "Overview",
      items: [{ label: "Overview", to: "/admin", icon: LayoutDashboard }],
    },
    {
      label: "Network",
      items: [
        { label: "Changemakers", to: "/admin/changemakers", icon: Users },
        { label: "Organizations", icon: Building2 },
        { label: "Connections", icon: Share2 },
      ],
    },
    {
      label: "Impact",
      items: [
        { label: "SDGs & Impact", icon: Target },
        { label: "Geography", icon: MapPin },
      ],
    },
    {
      label: "Moderation",
      items: [
        {
          label: "Verification Queue",
          to: "/admin/verification",
          icon: ShieldCheck,
          // Spread instead of `badge: undefined` so the optional prop is
          // genuinely absent under `exactOptionalPropertyTypes`.
          ...(attentionCount > 0 ? { badge: attentionCount } : {}),
        },
        { label: "Reports & Flags", icon: Flag },
      ],
    },
    {
      label: "Insights",
      items: [
        { label: "Analytics", icon: BarChart3 },
        { label: "Activity Log", icon: History },
      ],
    },
    {
      label: "System",
      items: [{ label: "Settings", icon: Settings }],
    },
  ];
}

export function AdminSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const sections = useNavSections();

  return (
    <>
      {open && (
        <button
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
        />
      )}

      <aside
        className={`fixed bottom-0 left-0 top-0 z-40 w-[240px] flex-none border-r border-border bg-secondary/40 transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-5 py-5">
            <div>
              <p className="text-sm font-semibold text-foreground">Common Ground</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Admin</p>
            </div>
            <button onClick={onClose} className="text-muted-foreground lg:hidden" aria-label="Close navigation">
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 pb-4">
            {sections.map((section) => (
              <div key={section.label} className="mb-5">
                <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {section.label}
                </p>

                <div className="flex flex-col gap-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;

                    if (!item.to) {
                      return (
                        <div
                          key={item.label}
                          title="Coming soon"
                          className="flex cursor-not-allowed items-center justify-between rounded-md px-2 py-2 text-sm text-muted-foreground/50"
                        >
                          <span className="flex items-center gap-2.5">
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </span>
                          <span className="text-[9px] uppercase tracking-wide">Soon</span>
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={item.label}
                        to={item.to}
                        onClick={onClose}
                        activeOptions={{ exact: item.to === "/admin" }}
                        className="flex items-center justify-between rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        activeProps={{ className: "!bg-primary !text-primary-foreground" }}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </span>
                        {!!item.badge && (
                          <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-border px-5 py-4">
            <p className="text-xs font-semibold text-foreground">{currentAdmin.name}</p>
            <p className="text-[11px] text-muted-foreground">{currentAdmin.role}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
