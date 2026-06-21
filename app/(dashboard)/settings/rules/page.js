"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Workflow, Plus, Trash2, ChevronDown,
  TrendingUp, UserRound, CalendarClock, CheckSquare, Stethoscope,
  Play, History, CheckCircle2, AlertTriangle, MinusCircle, Blocks,
} from "lucide-react";
import { Button, Card, Input, Spinner, Switch } from "@/components/ui";
import { useOrg } from "@/lib/context/OrgContext";
import { toast } from "@/lib/toast";
import { showConfirm } from "@/lib/confirm";
import {
  updateOrganization, getTags, getAutomationRuns,
  getLeads, getPatients, getAppointments, getTasks, getConsultations,
} from "@/lib/supabase/queries";
import {
  RULE_TARGETS, RULE_EVENTS, RULE_ACTIONS, ruleActions, eventLabel, evaluateConditions,
} from "@/lib/rulesEngine";

// Blockly canvas is client-only and heavy → load it lazily, off SSR.
const RuleBlocklyCanvas = dynamic(() => import("@/components/crm/RuleBlocklyCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-xl border border-(--color-border) flex items-center justify-center" style={{ height: 560, background: "#f8fafc" }}>
      <Spinner size={26} />
    </div>
  ),
});

const uid = () => crypto.randomUUID?.() || Math.random().toString(36).slice(2);

const DEFAULT_LEAD_STAGES = ["New", "Contacted", "Interested", "Follow-up", "Converted", "Lost"];

const blankAction = (target = "lead") => ({ type: RULE_ACTIONS[target][0].value, value: "" });
const blankRule = (target = "lead") => ({
  id: uid(),
  name: "",
  enabled: true,
  target,
  event: RULE_EVENTS[target][0].value,
  condition_match: "all",
  conditions: [],
  condition_groups: [],
  actions: [blankAction(target)],
});

const ENTITY_KEY = { lead: "leads", patient: "patients", consultation: "consultations" };

const TARGET_META = {
  lead:         { label: "Lead",         ruleLabel: "Lead rule",         icon: TrendingUp,    color: "#1d4ed8", bg: "#dbeafe" },
  patient:      { label: "Patient",      ruleLabel: "Patient rule",      icon: UserRound,     color: "#15803d", bg: "#dcfce7" },
  appointment:  { label: "Appointment", ruleLabel: "Appointment rule",  icon: CalendarClock, color: "#7c3aed", bg: "#ede9fe" },
  task:         { label: "Task",         ruleLabel: "Task rule",         icon: CheckSquare,   color: "#b45309", bg: "#fef3c7" },
  consultation: { label: "Consultation",ruleLabel: "Consultation rule", icon: Stethoscope,   color: "#0ea5e9", bg: "#e0f2fe" },
};

const RUN_STATUS_STYLE = {
  success: { bg: "#dcfce7", color: "#15803d", icon: CheckCircle2,  label: "Success" },
  partial: { bg: "#fef3c7", color: "#b45309", icon: AlertTriangle, label: "Partial" },
  failed:  { bg: "#fee2e2", color: "#b91c1c", icon: AlertTriangle, label: "Failed" },
  skipped: { bg: "#f3f4f6", color: "#6b7280", icon: MinusCircle,   label: "Skipped" },
};

function sampleLabel(target, e) {
  if (!e) return "record";
  if (target === "lead") return e.title || [e.first_name, e.last_name].filter(Boolean).join(" ") || e.phone || "lead";
  if (target === "patient") return [e.first_name, e.last_name].filter(Boolean).join(" ") || e.phone || "patient";
  if (target === "appointment") return `appointment ${e.scheduled_at ? new Date(e.scheduled_at).toLocaleDateString() : ""}`.trim();
  if (target === "task") return e.title || "task";
  if (target === "consultation") return e.chief_complaint || "consultation";
  return "record";
}

async function fetchSampleEntity(target, orgId) {
  const o = { orgId };
  if (target === "lead") return (await getLeads(o))?.[0] || null;
  if (target === "patient") return (await getPatients(o))?.[0] || null;
  if (target === "appointment") return (await getAppointments(o))?.[0] || null;
  if (target === "task") return (await getTasks(o))?.[0] || null;
  if (target === "consultation") return (await getConsultations(o))?.[0] || null;
  return null;
}

const tagsForTarget = (allTags, target) =>
  (allTags || []).filter((t) => (target === "lead" ? t.page === "leads" : t.page === "patients" || !t.page));

export default function RulesPage() {
  const { org, orgId } = useOrg();
  const [rules, setRules] = useState([]);
  const [tags, setTags] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // Test panel state (per selected rule).
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showRuns, setShowRuns] = useState(false);

  const stages = (org?.settings?.lead_stages || DEFAULT_LEAD_STAGES).map((s) =>
    typeof s === "string" ? s : s.name,
  );

  useEffect(() => {
    if (!orgId) return;
    const existing = org?.settings?.rules;
    if (Array.isArray(existing)) {
      const migrated = existing.map((r) =>
        Array.isArray(r.actions) ? r : { ...r, actions: r.action ? [r.action] : [], action: undefined },
      );
      setRules(migrated);
      setSelectedId((id) => id || migrated[0]?.id || null);
    } else if (Array.isArray(org?.settings?.stage_rules)) {
      const migrated = org.settings.stage_rules.map((r) => ({
        id: r.id || uid(), name: "Imported rule", enabled: true, target: "lead",
        event: r.event, condition_match: "all", conditions: [], condition_groups: [],
        actions: [{ type: "set_stage", value: r.stage }],
      }));
      setRules(migrated);
      setSelectedId((id) => id || migrated[0]?.id || null);
    }
    getTags(orgId).then((t) => setTags(t || [])).catch(() => setTags([])).finally(() => setLoading(false));
    getAutomationRuns({ orgId, limit: 200 }).then((r) => setRuns(r || [])).catch(() => setRuns([]));
  }, [orgId, org]);

  const selected = rules.find((r) => r.id === selectedId) || null;
  const selectedRuns = runs.filter((x) => x.rule_id === selectedId);

  const addRule = (target) => {
    const r = blankRule(target);
    setRules((prev) => [...prev, r]);
    setSelectedId(r.id);
    setDirty(true);
    setTestResult(null);
  };

  // Canvas emits canonical fields; preserve id/name/enabled.
  const onCanvasChange = (updated) => {
    setRules((prev) => prev.map((r) => (r.id === selectedId ? { ...r, ...updated } : r)));
    setDirty(true);
  };

  const patchSelected = (patch) => {
    setRules((prev) => prev.map((r) => (r.id === selectedId ? { ...r, ...patch } : r)));
    setDirty(true);
  };

  const removeRule = async (id) => {
    const ok = await showConfirm({ title: "Delete this rule?", confirmLabel: "Delete" });
    if (!ok) return;
    setRules((prev) => {
      const next = prev.filter((r) => r.id !== id);
      if (id === selectedId) setSelectedId(next[0]?.id || null);
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateOrganization(orgId, { settings: { ...(org?.settings || {}), rules } });
      setSavedAt(Date.now());
      setDirty(false);
    } catch (err) {
      toast({ type: "error", title: "Error", message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    if (!selected) return;
    setTesting(true);
    setTestResult(null);
    try {
      const sample = await fetchSampleEntity(selected.target, orgId);
      if (!sample) { setTestResult({ error: `No ${selected.target} records to test against yet.` }); return; }
      const matched = evaluateConditions(sample, selected, null);
      setTestResult({ sample, matched, actions: matched ? ruleActions(selected) : [] });
    } catch (e) {
      setTestResult({ error: e.message });
    } finally {
      setTesting(false);
    }
  };

  const canvasCtx = selected && {
    stages,
    tags: tagsForTarget(tags, selected.target),
    staff: org?.settings?.staff_members || [],
    customFields: org?.settings?.api_fields?.[ENTITY_KEY[selected.target]] || [],
  };

  return (
    <div className="flex -m-6 -mb-16 h-screen" style={{ background: "var(--color-bg)" }}>
      {/* ── Left flush rail: saved rules (like the Integrations side nav) ── */}
      <aside className="w-64 shrink-0 border-r border-(--color-border) h-full flex flex-col" style={{ background: "var(--color-surface)" }}>
        <div className="p-4 border-b border-(--color-border) flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-700 tracking-tight" style={{ color: "var(--color-text-primary)" }}>Rules</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Automation</p>
          </div>
          <div className="relative">
            {addOpen && <div className="fixed inset-0 z-10" onClick={() => setAddOpen(false)} />}
            <Button size="sm" variant="secondary" className="relative z-20" onClick={() => setAddOpen((o) => !o)}>
              <Plus size={14} /> Add
              <ChevronDown size={13} style={{ transform: addOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
            </Button>
            {addOpen && (
              <div className="absolute top-full right-0 mt-1.5 w-48 rounded-xl border border-(--color-border) overflow-hidden z-20"
                style={{ background: "var(--color-surface)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
                {RULE_TARGETS.map(({ value }) => {
                  const meta = TARGET_META[value];
                  const Icon = meta.icon;
                  return (
                    <button key={value} type="button"
                      onClick={() => { addRule(value); setAddOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-600 text-left transition-colors hover:bg-(--color-surface-2)">
                      <Icon size={14} style={{ color: meta.color }} />
                      <span style={{ color: "var(--color-text-primary)" }}>{meta.ruleLabel}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {loading ? (
            <div className="flex justify-center py-8"><Spinner size={22} /></div>
          ) : rules.length === 0 ? (
            <p className="text-xs text-center px-3 py-8" style={{ color: "var(--color-text-muted)" }}>
              No rules yet. Click <b>Add</b> to create one.
            </p>
          ) : (
            rules.map((r) => {
              const meta = TARGET_META[r.target] || TARGET_META.lead;
              const Icon = meta.icon;
              const active = r.id === selectedId;
              return (
                <button key={r.id} type="button" onClick={() => { setSelectedId(r.id); setTestResult(null); }}
                  className="w-full text-left rounded-lg border p-2.5 transition-all"
                  style={active
                    ? { borderColor: "var(--color-brand)", background: "var(--color-brand-50)" }
                    : { borderColor: "transparent", background: "transparent" }}>
                  <div className="flex items-center gap-2">
                    <Icon size={14} style={{ color: meta.color, flexShrink: 0 }} />
                    <span className="flex-1 min-w-0 text-sm font-600 truncate" style={{ color: "var(--color-text-primary)" }}>
                      {r.name || "Untitled rule"}
                    </span>
                    <span className="w-2 h-2 rounded-full shrink-0" title={r.enabled ? "Enabled" : "Disabled"}
                      style={{ background: r.enabled ? "#22c55e" : "#cbd5e1" }} />
                  </div>
                  <p className="text-[11px] mt-1 truncate" style={{ color: "var(--color-text-muted)" }}>
                    {meta.label} · {eventLabel(r.target, r.event)}
                  </p>
                </button>
              );
            })
          )}
        </nav>
      </aside>

      {/* ── Right content: selected rule ── */}
      <div className="flex-1 min-w-0 h-full overflow-y-auto p-6 pb-16">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-sm font-600" style={{ color: "var(--color-text-primary)" }}>Automation Rules</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Snap together blocks — WHEN an event happens, IF conditions match, DO actions. Runs on the server.
              {saving ? " · Saving…" : dirty ? " · Unsaved changes" : savedAt ? " · Saved" : ""}
            </p>
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>{saving ? "Saving…" : "Save"}</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner size={28} /></div>
        ) : rules.length === 0 ? (
          <div className="py-20 text-center border border-dashed rounded-2xl border-(--color-border)">
            <Blocks size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm font-500" style={{ color: "var(--color-text-muted)" }}>No rules yet.</p>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
              Click <b>Add</b> in the left panel to create a Lead, Patient, Appointment, Task, or Consultation rule.
            </p>
          </div>
        ) : selected ? (
            <div className="space-y-3">
              <Card className="p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <Input
                    placeholder="Rule name (e.g. Tag hot website leads)"
                    value={selected.name}
                    onChange={(e) => patchSelected({ name: e.target.value })}
                    className="flex-1 min-w-48"
                  />
                  <label className="flex items-center gap-2 text-xs font-600 shrink-0" style={{ color: "var(--color-text-muted)" }}>
                    <Switch checked={selected.enabled} onChange={() => patchSelected({ enabled: !selected.enabled })} />
                    {selected.enabled ? "Enabled" : "Disabled"}
                  </label>
                  <button type="button" onClick={() => removeRule(selected.id)}
                    className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0">
                    <Trash2 size={15} />
                  </button>
                </div>
                <p className="text-[11px] mt-2" style={{ color: "var(--color-text-muted)" }}>
                  Drag blocks from the left palette. Change the target/event on the yellow WHEN block.
                </p>
              </Card>

              {/* Blockly canvas — keyed by rule id so switching rules reloads cleanly */}
              <RuleBlocklyCanvas key={selected.id} rule={selected} ctx={canvasCtx} onChange={onCanvasChange} />

              {/* Test + History */}
              <Card className="p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-[10px] font-700 uppercase tracking-wide flex items-center gap-1.5" style={{ color: "#16a34a" }}>
                    <Play size={12} /> Test &amp; History
                  </p>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={runTest} disabled={testing}
                      className="text-[11px] font-700 px-2.5 py-1.5 rounded-lg border border-(--color-border) hover:bg-(--color-surface-2) inline-flex items-center gap-1"
                      style={{ color: "var(--color-brand)" }}>
                      <Play size={12} /> {testing ? "Testing…" : "Test against latest record"}
                    </button>
                    {selectedRuns.length > 0 && (
                      <button type="button" onClick={() => setShowRuns((s) => !s)}
                        className="text-[11px] font-700 px-2.5 py-1.5 rounded-lg border border-(--color-border) hover:bg-(--color-surface-2) inline-flex items-center gap-1"
                        style={{ color: "var(--color-text-muted)" }}>
                        <History size={12} /> {selectedRuns.length} run{selectedRuns.length !== 1 ? "s" : ""}
                      </button>
                    )}
                  </div>
                </div>

                {testResult && (
                  <div className="mt-2 text-[11px] rounded-lg p-2.5 border border-(--color-border)" style={{ background: "var(--color-surface-2)" }}>
                    {testResult.error ? (
                      <span style={{ color: "#b45309" }}>{testResult.error}</span>
                    ) : (
                      <div className="space-y-1">
                        <p style={{ color: "var(--color-text-secondary)" }}>
                          Sample: <b>{sampleLabel(selected.target, testResult.sample)}</b> ·{" "}
                          {testResult.matched
                            ? <span style={{ color: "#15803d", fontWeight: 700 }}>conditions MATCH ✓</span>
                            : <span style={{ color: "#b91c1c", fontWeight: 700 }}>conditions do not match ✗</span>}
                        </p>
                        {testResult.matched && (
                          <p style={{ color: "var(--color-text-muted)" }}>Would run: {testResult.actions.map((a) => a.type).join(", ") || "—"}</p>
                        )}
                        <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                          Dry run — no records changed. Save the rule so it runs automatically.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {showRuns && selectedRuns.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {selectedRuns.slice(0, 8).map((r) => {
                      const st = RUN_STATUS_STYLE[r.status] || RUN_STATUS_STYLE.skipped;
                      const StIcon = st.icon;
                      return (
                        <div key={r.id} className="flex items-center gap-2 text-[11px] px-2 py-1.5 rounded-lg" style={{ background: "var(--color-surface-2)" }}>
                          <span className="inline-flex items-center gap-1 font-700 px-1.5 py-0.5 rounded" style={{ background: st.bg, color: st.color }}>
                            <StIcon size={11} /> {st.label}
                          </span>
                          <span style={{ color: "var(--color-text-muted)" }}>{eventLabel(r.target, r.event)}</span>
                          {r.error && <span className="truncate" style={{ color: "#b91c1c" }} title={r.error}>· {r.error}</span>}
                          <span className="ml-auto shrink-0" style={{ color: "var(--color-text-muted)" }}>{new Date(r.created_at).toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
        ) : null}
      </div>
    </div>
  );
}
