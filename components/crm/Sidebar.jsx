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
  Landmark,
  ArrowLeftRight,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Bell,
  Stethoscope,
  Pill,
  BarChart3,
  Search,
  Radio,
  Plus,
  X as XIcon,
} from "lucide-react";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import clsx from "clsx";
import { useOrg } from "@/lib/context/OrgContext";
import { useSidebar } from "@/lib/context/SidebarContext";

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard",      icon: LayoutDashboard, label: "Dashboard",     permission: "dashboard" },
      { href: "/reports",        icon: BarChart3,        label: "Reports",       permission: "reports" },
    ],
  },
  {
    label: "Sales",
    items: [
      { href: "/leads",         icon: TrendingUp, label: "Leads",         permission: "leads" },
      { href: "/contacts",      icon: Users,    label: "Contacts",      permission: "contacts" },
      { href: "/organizations", icon: Building2, label: "Organizations", permission: "organizations" },
    ],
  },
  {
    label: "Care Delivery",
    items: [
      { href: "/patients",      icon: UserRound,    label: "Patients",      permission: "patients" },
      { href: "/appointments",  icon: CalendarDays, label: "Appointments",  permission: "appointments" },
      { href: "/consultation",  icon: Stethoscope,  label: "Consultations", permission: "consultations" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/tasks",    icon: CheckSquare, label: "Tasks",             permission: "tasks" },
      { type: "billing",   permission: "billing" },
      { href: "/pharmacy", icon: Pill,        label: "Pharmacy",          permission: "pharmacy" },
    ],
  },
];

const BILLING_SUB = [
  { href: "/billing", icon: CreditCard, label: "Invoices" },
  { href: "/billing/transactions", icon: ArrowLeftRight, label: "Transactions" },
  { href: "/billing/setup", icon: Landmark, label: "Setup", permission: "settings.organization" },
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
  const { org, hasPermission } = useOrg();
  const { collapsed: _collapsed, toggle } = useSidebar();
  const collapsed = forceExpanded ? false : _collapsed;

  const orgName = org?.name || "Your Clinic";

  const [billingOpen, setBillingOpen] = useState(() =>
    pathname.startsWith("/billing"),
  );
  const billingExpanded = billingOpen || pathname.startsWith("/billing");

  // Inline sidebar search
  const [searchQuery, setSearchQuery] = useState("")
  const [searchOpen, setSearchOpen]   = useState(false)
  const searchInputRef = useRef(null)
  const searchContainerRef = useRef(null)

  const openSearch = useCallback(() => {
    setSearchOpen(true)
    setTimeout(() => searchInputRef.current?.focus(), 0)
  }, [])

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setSearchQuery("")
  }, [])

  // ⌘K / Ctrl+K focuses the sidebar search instead of any modal
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        openSearch()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [openSearch])

  // Build the flat list of searchable nav items
  const searchNavItems = useMemo(() => {
    const items = []
    for (const group of navGroups) {
      for (const item of group.items) {
        if (item.type === "billing") {
          if (hasPermission("billing")) {
            BILLING_SUB.filter(s => !s.permission || hasPermission(s.permission))
              .forEach(s => items.push({ ...s, group: "Operations" }))
          }
        } else if (item.href && (!item.permission || hasPermission(item.permission))) {
          items.push({ ...item, group: group.label })
        }
      }
    }
    if (hasPermission("settings")) {
      items.push({ href: "/settings", icon: Settings, label: "Settings", group: "Settings" })
    }
    items.push({ href: "/status",  icon: Radio,        label: "System Status", group: "Other" })
    return items
  }, [hasPermission])

  const createActions = useMemo(() => [
    hasPermission("leads.create")        && { href: "/leads/new",        label: "New Lead",        icon: Plus },
    hasPermission("patients.create")     && { href: "/patients/new",     label: "New Patient",     icon: Plus },
    hasPermission("appointments.create") && { href: "/appointments/new", label: "New Appointment", icon: Plus },
  ].filter(Boolean), [hasPermission])

  const filteredNav = searchQuery.trim()
    ? searchNavItems.filter(i => i.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : searchNavItems

  const filteredCreate = searchQuery.trim()
    ? createActions.filter(i => i.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : createActions

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

  const renderBillingNav = () => {
    if (collapsed) {
      return (
        <Link
          key="billing"
          href="/billing"
          onClick={() => setMobileOpen(false)}
          title="Billing & Finance"
          className={navLinkClass(isActive("/billing"))}
          style={navLinkStyle(isActive("/billing"))}
        >
          <CreditCard size={17} />
        </Link>
      );
    }

    return (
      <div key="billing">
        <button
          type="button"
          onClick={() => setBillingOpen((o) => !o)}
          className={clsx(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
            isActive("/billing") ? "text-white" : "hover:bg-(--color-brand-50)",
          )}
          style={
            isActive("/billing")
              ? { background: "var(--color-brand)", color: "white" }
              : { color: "var(--color-text-secondary)" }
          }
        >
          <CreditCard size={17} />
          <span className="flex-1 text-left">Billing & Finance</span>
          <ChevronDown
            size={14}
            className="opacity-60 transition-transform duration-200"
            style={{ transform: billingExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>

        {billingExpanded && (
          <div className="mt-0.5 ml-3 space-y-0.5">
            {BILLING_SUB.filter((s) => !s.permission || hasPermission(s.permission)).map(({ href, icon: Icon, label }) => {
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

      {/* Inline sidebar search */}
      {!collapsed && (
        <div
          ref={searchContainerRef}
          className="mx-2 mt-3 mb-1"
          onBlur={(e) => {
            if (!searchContainerRef.current?.contains(e.relatedTarget)) closeSearch()
          }}
        >
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all"
            style={{
              borderColor: searchOpen ? 'var(--color-brand)' : 'var(--color-border)',
              background: 'var(--color-surface-2)',
              boxShadow: searchOpen ? '0 0 0 3px var(--color-brand-50)' : 'none',
            }}
          >
            <Search size={13} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={e => { if (e.key === "Escape") closeSearch() }}
              placeholder="Search…"
              className="flex-1 bg-transparent outline-none text-xs min-w-0"
              style={{ color: 'var(--color-text-primary)' }}
            />
            {searchOpen ? (
              <button type="button" tabIndex={-1} onClick={closeSearch} className="shrink-0 hover:opacity-70 transition-opacity">
                <XIcon size={12} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            ) : (
              <kbd
                onClick={openSearch}
                className="text-[10px] font-600 px-1 py-0.5 rounded border cursor-pointer select-none shrink-0"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
              >
                ⌘K
              </kbd>
            )}
          </div>

          {searchOpen && (
            <div
              className="mt-1.5 rounded-xl border overflow-hidden"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            >
              <div className="max-h-[320px] overflow-y-auto [scrollbar-width:thin]">
                {filteredNav.length > 0 && (
                  <div className="p-1.5">
                    <p className="px-2.5 pt-1 pb-1 text-[9px] font-800 uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Navigate</p>
                    {filteredNav.map(item => {
                      const Icon = item.icon
                      const active = isActive(item.href)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          tabIndex={0}
                          onClick={() => { closeSearch(); setMobileOpen(false) }}
                          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-500 transition-colors hover:bg-(--color-brand-50)"
                          style={{ color: active ? 'var(--color-brand)' : 'var(--color-text-secondary)' }}
                        >
                          <Icon size={13} />
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                )}

                {filteredCreate.length > 0 && (
                  <div className="p-1.5 border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <p className="px-2.5 pt-1 pb-1 text-[9px] font-800 uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Create</p>
                    {filteredCreate.map(item => {
                      const Icon = item.icon
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          tabIndex={0}
                          onClick={() => { closeSearch(); setMobileOpen(false) }}
                          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-500 transition-colors hover:bg-(--color-brand-50)"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          <Icon size={13} />
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                )}

                {filteredNav.length === 0 && filteredCreate.length === 0 && (
                  <div className="px-4 py-5 text-center">
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      No results for &ldquo;{searchQuery}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Nav — hidden while search results are shown */}
      <nav className={`flex-1 px-2 py-4 space-y-4 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--color-border)_transparent] [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-(--color-border) [&::-webkit-scrollbar-thumb:hover]:bg-(--color-text-muted)] ${!collapsed && searchOpen ? 'hidden' : ''}`}>
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(item => !item.permission || hasPermission(item.permission))
          if (visibleItems.length === 0) return null
          return (
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
              {visibleItems.map((item) =>
                item.type === "billing" ? renderBillingNav()
                  : renderNavLink(item),
              )}
            </div>
          </div>
          )
        })}
      </nav>

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
