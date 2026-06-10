"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  TrendingUp,
  CheckSquare,
  Heart,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  UserRound,
  CalendarDays,
  CreditCard,
  Zap,
  Settings,
  CircleHelp,
  MessageSquare,
  ChevronsLeft,
  ChevronsRight,
  Bell,
  Kanban,
  ListFilter,
  Stethoscope,
  BarChart3,
  BellRing,
} from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { useOrg } from "@/lib/context/OrgContext";
import { useSidebar } from "@/lib/context/SidebarContext";

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/notifications", icon: BellRing, label: "Notifications" },
      { href: "/reports", icon: BarChart3, label: "Reports" },
    ],
  },
  {
    label: "Sales",
    items: [
      { type: "leads" },
      { href: "/contacts", icon: Users, label: "Contacts" },
      { href: "/organizations", icon: Building2, label: "Organizations" },
    ],
  },
  {
    label: "Care Delivery",
    items: [
      { href: "/patients", icon: UserRound, label: "Patients" },
      { href: "/appointments", icon: CalendarDays, label: "Appointments" },
      { href: "/consultation", icon: Stethoscope, label: "Consultations" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/tasks", icon: CheckSquare, label: "Tasks" },
      { href: "/billing", icon: CreditCard, label: "Billing & Finance" },
    ],
  },
  {
    label: "Tools",
    items: [{ href: "/automation", icon: Zap, label: "Automation" }],
  },
];

const LEADS_SUB = [
  { href: "/leads", icon: ListFilter, label: "All Leads" },
  { href: "/leads/pipeline", icon: Kanban, label: "Lead Pipeline" },
];

function OrgLogo({ logoUrl, orgName }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={orgName}
        className="w-8 h-8 rounded-lg object-cover shrink-0 border border-(--color-border)"
        onError={(e) => {
          e.target.style.display = "none";
          e.target.nextSibling?.style.removeProperty("display");
        }}
      />
    );
  }
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
      style={{ background: "var(--color-brand)" }}
    >
      <Heart size={16} className="text-white" />
    </div>
  );
}

function SidebarContent({ pathname, setMobileOpen, forceExpanded = false }) {
  const { org } = useOrg();
  const { collapsed: _collapsed, toggle } = useSidebar();
  const collapsed = forceExpanded ? false : _collapsed;

  const orgName = org?.name || "Your Clinic";

  const [leadsOpen, setLeadsOpen] = useState(() =>
    pathname.startsWith("/leads"),
  );
  const leadsExpanded = leadsOpen || pathname.startsWith("/leads");

  const isActive = (href) =>
    href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");

  const navLinkClass = (active) =>
    clsx(
      "flex items-center rounded-lg text-sm font-medium transition-all",
      collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
      active ? "text-white" : "hover:bg-(--color-brand-50)",
    );

  const navLinkStyle = (active) =>
    active
      ? { background: "var(--color-brand)", color: "white" }
      : { color: "var(--color-text-secondary)" };

  const renderNavLink = ({ href, icon: Icon, label }) => {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setMobileOpen(false)}
        title={collapsed ? label : undefined}
        className={navLinkClass(active)}
        style={navLinkStyle(active)}
      >
        <Icon size={17} />
        {!collapsed && label}
        {!collapsed && active && (
          <ChevronRight size={14} className="ml-auto opacity-60" />
        )}
      </Link>
    );
  };

  const renderLeadsNav = () => {
    if (collapsed) {
      return (
        <Link
          key="leads"
          href="/leads"
          onClick={() => setMobileOpen(false)}
          title="Leads"
          className={navLinkClass(isActive("/leads"))}
          style={navLinkStyle(isActive("/leads"))}
        >
          <TrendingUp size={17} />
        </Link>
      );
    }

    return (
      <div key="leads">
        <button
          type="button"
          onClick={() => setLeadsOpen((o) => !o)}
          className={clsx(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
            isActive("/leads") ? "text-white" : "hover:bg-(--color-brand-50)",
          )}
          style={
            isActive("/leads")
              ? { background: "var(--color-brand)", color: "white" }
              : { color: "var(--color-text-secondary)" }
          }
        >
          <TrendingUp size={17} />
          <span className="flex-1 text-left">Leads</span>
          <ChevronDown
            size={14}
            className="opacity-60 transition-transform duration-200"
            style={{ transform: leadsExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>

        {leadsExpanded && (
          <div className="mt-0.5 ml-3 space-y-0.5">
            {LEADS_SUB.map(({ href, icon: Icon, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 pr-2.5 py-2 text-xs font-500 transition-colors"
                  style={
                    active
                      ? {
                          borderLeft: "2px solid var(--color-brand)",
                          color: "var(--color-brand)",
                          paddingLeft: "10px",
                        }
                      : {
                          borderLeft: "2px solid transparent",
                          color: "var(--color-text-secondary)",
                          paddingLeft: "10px",
                        }
                  }
                >
                  <Icon size={14} />
                  {label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo + collapse toggle */}
      <div
        className={clsx(
          "flex items-center border-b border-(--color-border)",
          collapsed ? "flex-col gap-2 px-3 py-4" : "gap-2.5 px-4 py-4",
        )}
      >
        {!collapsed ? (
          <>
            <OrgLogo logoUrl={org?.settings?.logo_url} orgName={orgName} />
            <div className="flex-1 min-w-0">
              <span
                className="font-700 text-sm tracking-tight block truncate"
                style={{ color: "var(--color-text-primary)" }}
              >
                {orgName}
              </span>
              <p
                className="text-[10px] truncate"
                style={{ color: "var(--color-text-muted)" }}
              >
                Healthcare CRM
              </p>
            </div>
            <button
              onClick={toggle}
              className="hidden md:flex p-1.5 rounded-lg hover:bg-(--color-brand-50) transition-colors shrink-0"
              style={{ color: "var(--color-text-muted)" }}
              title="Collapse sidebar"
            >
              <ChevronsLeft size={16} />
            </button>
          </>
        ) : (
          <>
            <OrgLogo logoUrl={org?.settings?.logo_url} orgName={orgName} />
            <button
              onClick={toggle}
              className="hidden md:flex p-1.5 rounded-lg hover:bg-(--color-brand-50) transition-colors"
              style={{ color: "var(--color-text-muted)" }}
              title="Expand sidebar"
            >
              <ChevronsRight size={16} />
            </button>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-4 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--color-border)_transparent] [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-(--color-border) [&::-webkit-scrollbar-thumb:hover]:bg-(--color-text-muted)">
        {navGroups.map((group) => (
          <div
            key={group.label}
            className={collapsed ? "space-y-0.5" : "space-y-1"}
          >
            {!collapsed && (
              <p
                className="px-3 text-[10px] font-800 uppercase tracking-widest"
                style={{ color: "var(--color-text-muted)" }}
              >
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) =>
                item.type === "leads" ? renderLeadsNav() : renderNavLink(item),
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: settings */}
      <div className="px-2 pb-4 border-t border-(--color-border) pt-3 space-y-1">
        <Link
          href="/help"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setMobileOpen(false)}
          title={collapsed ? "Help" : undefined}
          className={navLinkClass(false)}
          style={navLinkStyle(false)}
        >
          <CircleHelp size={16} />
          {!collapsed && "Help"}
        </Link>

        <Link
          href="/feedback"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setMobileOpen(false)}
          title={collapsed ? "Feedback" : undefined}
          className={navLinkClass(false)}
          style={navLinkStyle(false)}
        >
          <MessageSquare size={16} />
          {!collapsed && "Feedback"}
        </Link>

        <Link
          href="/settings"
          onClick={() => setMobileOpen(false)}
          title={collapsed ? "Settings" : undefined}
          className={navLinkClass(isActive("/settings"))}
          style={navLinkStyle(isActive("/settings"))}
        >
          <Settings size={16} />
          {!collapsed && "Settings"}
        </Link>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { collapsed } = useSidebar();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col fixed left-0 top-0 h-full z-20 border-r border-(--color-border) transition-all duration-300"
        style={{
          width: collapsed ? "64px" : "220px",
          background: "var(--color-surface)",
        }}
      >
        <SidebarContent pathname={pathname} setMobileOpen={setMobileOpen} />
      </aside>

      {/* Mobile toggle button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg border border-(--color-border) bg-white"
        onClick={() => setMobileOpen((o) => !o)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="absolute left-0 top-0 h-full w-64 border-r border-(--color-border)"
            style={{ background: "var(--color-surface)" }}
          >
            <SidebarContent
              pathname={pathname}
              setMobileOpen={setMobileOpen}
              forceExpanded
            />
          </aside>
        </div>
      )}
    </>
  );
}
