"use client";
import { useState, useEffect } from "react";
import {
  Workflow,
  Plus,
  Trash2,
  ChevronDown,
  Filter,
  Zap,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { Button, Card, Input, Select, Spinner, Switch } from "@/components/ui";
import { useOrg } from "@/lib/context/OrgContext";
import { updateOrganization, getTags } from "@/lib/supabase/queries";
import {
  RULE_TARGETS,
  RULE_EVENTS,
  RULE_FIELDS,
  RULE_OPS,
  RULE_ACTIONS,
  FIELD_OPTIONS,
  ACTION_KIND,
  PRIORITIES,
  FOLLOWUP_TYPES,
  ruleActions,
  eventLabel,
} from "@/lib/rulesEngine";

const uid = () => crypto.randomUUID?.() || Math.random().toString(36).slice(2);

const DEFAULT_LEAD_STAGES = [
  "New",
  "Contacted",
  "Interested",
  "Follow-up",
  "Converted",
  "Lost",
];

const blankAction = (target = "lead") => ({ type: RULE_ACTIONS[target][0].value, value: "" });

const blankRule = (target = "lead") => ({
  id: uid(),
  name: "",
  enabled: true,
  target,
  event: RULE_EVENTS[target][0].value,
  condition_match: "all",
  conditions: [],
  actions: [blankAction(target)],
});

function RuleCard({ rule, stages, tags, staff, onChange, onRemove }) {
  const [open, setOpen] = useState(!rule.name);
  const events = RULE_EVENTS[rule.target] || [];
  const fields = RULE_FIELDS[rule.target] || [];
  const actionTypes = RULE_ACTIONS[rule.target] || [];
  const ruleActionList = ruleActions(rule);

  const patch = (p) => onChange({ ...rule, ...p });

  // ── Actions (multiple) ──
  const setActionAt = (i, p) =>
    onChange({
      ...rule,
      actions: ruleActionList.map((a, idx) => (idx === i ? { ...a, ...p } : a)),
    });
  const addAction = () =>
    onChange({ ...rule, action: undefined, actions: [...ruleActionList, blankAction(rule.target)] });
  const removeAction = (i) =>
    onChange({ ...rule, action: undefined, actions: ruleActionList.filter((_, idx) => idx !== i) });

  const addCond = () =>
    onChange({
      ...rule,
      conditions: [
        ...(rule.conditions || []),
        { field: fields[0], op: "==", value: "" },
      ],
    });
  const setCond = (i, p) =>
    onChange({
      ...rule,
      conditions: rule.conditions.map((c, idx) =>
        idx === i ? { ...c, ...p } : c,
      ),
    });
  const removeCond = (i) =>
    onChange({
      ...rule,
      conditions: rule.conditions.filter((_, idx) => idx !== i),
    });

  const groups = rule.condition_groups || [];

  const patchGroups = (condition_groups) =>
    onChange({ ...rule, condition_groups });

  const addGroup = (match = "all") =>
    patchGroups([
      ...groups,
      { id: uid(), match, conditions: [] },
    ]);

  const updateGroup = (groupId, patch) =>
    patchGroups(groups.map((g) => (g.id === groupId ? { ...g, ...patch } : g)));

  const removeGroup = (groupId) =>
    patchGroups(groups.filter((g) => g.id !== groupId));

  const addCondToGroup = (groupId) =>
    patchGroups(
      groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              conditions: [
                ...(g.conditions || []),
                { field: fields[0], op: "==", value: "" },
              ],
            }
          : g,
      ),
    );

  const setGroupCond = (groupId, condIndex, patch) =>
    patchGroups(
      groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              conditions: (g.conditions || []).map((c, idx) =>
                idx === condIndex ? { ...c, ...patch } : c,
              ),
            }
          : g,
      ),
    );

  const removeGroupCond = (groupId, condIndex) =>
    patchGroups(
      groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              conditions: (g.conditions || []).filter((_, idx) => idx !== condIndex),
            }
          : g,
      ),
    );

  const moveConditionToGroup = (dragData, targetGroupId) => {
    let moved = null;
    let nextConditions = rule.conditions || [];
    let nextGroups = groups.map((g) => ({ ...g, conditions: [...(g.conditions || [])] }));

    if (dragData.source === "loose") {
      moved = nextConditions[dragData.index];
      nextConditions = nextConditions.filter((_, idx) => idx !== dragData.index);
    } else if (dragData.source === "group") {
      nextGroups = nextGroups.map((g) => {
        if (g.id !== dragData.groupId) return g;
        moved = g.conditions[dragData.index];
        return { ...g, conditions: g.conditions.filter((_, idx) => idx !== dragData.index) };
      });
    }

    if (!moved) return;
    nextGroups = nextGroups.map((g) =>
      g.id === targetGroupId ? { ...g, conditions: [...g.conditions, moved] } : g,
    );
    onChange({ ...rule, conditions: nextConditions, condition_groups: nextGroups });
  };

  const moveConditionToLoose = (dragData) => {
    if (dragData.source !== "group") return;
    let moved = null;
    const nextGroups = groups.map((g) => {
      if (g.id !== dragData.groupId) return g;
      moved = (g.conditions || [])[dragData.index];
      return { ...g, conditions: (g.conditions || []).filter((_, idx) => idx !== dragData.index) };
    });
    if (!moved) return;
    onChange({
      ...rule,
      conditions: [...(rule.conditions || []), moved],
      condition_groups: nextGroups,
    });
  };

  const readDragData = (e) => {
    try { return JSON.parse(e.dataTransfer.getData("application/json")); }
    catch { return null; }
  };

  const renderCondition = (c, actions) => (
    <div
      key={actions.key}
      draggable
      onDragStart={actions.onDragStart}
      className="group flex items-center gap-2 p-2 rounded-xl border border-(--color-border) cursor-grab active:cursor-grabbing transition-all hover:shadow-sm"
      style={{ background: "var(--color-surface)" }}
    >
      <span className="text-[10px] font-800 px-2 py-1 rounded-lg select-none" style={{ background: "#f3e8ff", color: "#7c3aed" }}>⋮⋮</span>
      <select
        value={c.field}
        onChange={(e) => actions.set({ field: e.target.value })}
        className="px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
        style={{ background: "var(--color-surface)", color: "var(--color-text-primary)" }}
      >
        {fields.map((f) => <option key={f} value={f}>{f}</option>)}
      </select>
      <select
        value={c.op}
        onChange={(e) => actions.set({ op: e.target.value })}
        className="px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
        style={{ background: "var(--color-surface)", color: "var(--color-text-primary)" }}
      >
        {RULE_OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {(() => {
        const opts = c.field === "stage" ? stages : FIELD_OPTIONS[c.field];
        if (opts && c.op !== ">" && c.op !== "<" && c.op !== "contains") {
          return (
            <select
              value={c.value}
              onChange={(e) => actions.set({ value: e.target.value })}
              className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
              style={{ background: "var(--color-surface)", color: "var(--color-text-primary)" }}
            >
              <option value="">Select…</option>
              {opts.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          );
        }
        return (
          <input
            value={c.value}
            onChange={(e) => actions.set({ value: e.target.value })}
            placeholder="value"
            type={c.field === "value" ? "number" : "text"}
            className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
            style={{ background: "var(--color-surface)", color: "var(--color-text-primary)" }}
          />
        );
      })()}
      <button type="button" onClick={actions.remove} className="p-1 text-gray-400 hover:text-red-500">
        <Trash2 size={13} />
      </button>
    </div>
  );

  // when target changes, reset event + actions to that target's options
  const changeTarget = (target) =>
    onChange({
      ...rule,
      target,
      event: RULE_EVENTS[target][0].value,
      action: undefined,
      actions: [blankAction(target)],
      conditions: [],
      condition_groups: [],
    });

  const tagOptions = tags
    .filter((t) => t.page === rule.target + "s" || (!t.page && rule.target === "patient"))
    .map((t) => ({ value: t.id, label: t.name }));
  const staffOptions = (staff || []).map((m) => ({ value: m.id, label: m.name }));

  // Render the value input(s) for an action based on its kind.
  const renderActionValue = (a, i) => {
    const kind = ACTION_KIND[a.type];
    const sel = (opts, placeholder = "Select…") => (
      <select
        value={a.value || ""}
        onChange={(e) => setActionAt(i, { value: e.target.value })}
        className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded-lg border outline-none"
        style={{ background: "var(--color-surface)", color: "var(--color-text-primary)", borderColor: a.value ? "var(--color-border)" : "#f59e0b" }}
      >
        <option value="">{placeholder}</option>
        {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
    const txt = (key, ph, opts = {}) => (
      <input
        value={a[key] ?? ""}
        onChange={(e) => setActionAt(i, { [key]: e.target.value })}
        placeholder={ph}
        type={opts.type || "text"}
        className="min-w-0 px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
        style={{ background: "var(--color-surface)", color: "var(--color-text-primary)", width: opts.width || "auto", flex: opts.flex }}
      />
    );
    switch (kind) {
      case "stage":    return sel(stages.map((s) => ({ value: s, label: s })));
      case "status":   return sel(["Active", "Inactive"].map((s) => ({ value: s, label: s })));
      case "priority": return sel(PRIORITIES.map((s) => ({ value: s, label: s })));
      case "source":   return sel((FIELD_OPTIONS.source || []).map((s) => ({ value: s, label: s })));
      case "tag":      return sel(tagOptions, tagOptions.length ? "Select tag…" : "No tags for this page");
      case "staff":    return sel(staffOptions, staffOptions.length ? "Select member…" : "No team members");
      case "number":   return txt("value", "e.g. 5000", { type: "number", flex: 1 });
      case "text":     return txt("value", "Note text…", { flex: 1 });
      case "task":
        return (
          <>
            {txt("title", "Task title", { flex: 2 })}
            <select value={a.priority || "Medium"} onChange={(e) => setActionAt(i, { priority: e.target.value })}
              className="px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none" style={{ background: "var(--color-surface)", color: "var(--color-text-primary)" }}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            {txt("dueInDays", "in days", { type: "number", width: "5.5rem" })}
          </>
        );
      case "followup":
        return (
          <>
            <select value={a.fuType || "Call"} onChange={(e) => setActionAt(i, { fuType: e.target.value })}
              className="px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none" style={{ background: "var(--color-surface)", color: "var(--color-text-primary)" }}>
              {FOLLOWUP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {txt("inDays", "in days", { type: "number", width: "5.5rem" })}
          </>
        );
      case "notify":
        return (
          <>
            {txt("title", "Notification title", { flex: 1 })}
            {txt("message", "Message", { flex: 2 })}
          </>
        );
      default: return null;
    }
  };

  return (
    <div
      className="rounded-2xl border border-(--color-border) overflow-hidden"
      style={{ background: "var(--color-surface)" }}
    >
      {/* summary header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ background: "var(--color-surface-2)" }}
      >
        <Switch
          checked={rule.enabled}
          onChange={() => patch({ enabled: !rule.enabled })}
          title={rule.enabled ? "Enabled" : "Disabled"}
        />
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-600 truncate"
            style={{ color: "var(--color-text-primary)" }}
          >
            {rule.name || "Untitled rule"}
          </p>
          <p
            className="text-[11px] truncate"
            style={{ color: "var(--color-text-muted)" }}
          >
            <span className="capitalize">{rule.target}</span> ·{" "}
            {eventLabel(rule.target, rule.event)}
            {rule.conditions?.length
              ? ` · ${rule.condition_match === "any" ? "OR" : "AND"} · ${rule.conditions.length} condition${rule.conditions.length !== 1 ? "s" : ""}`
              : ""}
          </p>
        </div>
        <span
          className="text-[10px] font-700 px-2 py-0.5 rounded-full capitalize"
          style={
            rule.target === "lead"
              ? { background: "#dbeafe", color: "#1d4ed8" }
              : { background: "#dcfce7", color: "#15803d" }
          }
        >
          {rule.target}
        </span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="p-1.5 rounded-lg hover:bg-(--color-surface)"
          style={{ color: "var(--color-text-muted)" }}
        >
          <ChevronDown
            size={15}
            style={{
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform 0.15s",
            }}
          />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {open && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Rule name"
              placeholder="e.g. Tag hot Meta leads"
              value={rule.name}
              onChange={(e) => patch({ name: e.target.value })}
            />
            <Select
              label="Applies to"
              value={rule.target}
              onChange={(e) => changeTarget(e.target.value)}
              options={RULE_TARGETS}
            />
          </div>

          {/* WHEN */}
          <div
            className="rounded-xl border border-(--color-border) p-3"
            style={{ background: "var(--color-surface-2)" }}
          >
            <p
              className="text-[10px] font-700 uppercase tracking-wide mb-2 flex items-center gap-1.5"
              style={{ color: "#f59e0b" }}
            >
              <Zap size={12} /> When
            </p>
            <Select
              value={rule.event}
              onChange={(e) => patch({ event: e.target.value })}
              options={events.map((ev) => ({
                value: ev.value,
                label: ev.label,
              }))}
            />
          </div>

          {/* IF (conditions) */}
          <div className="rounded-2xl border border-(--color-border) p-3" style={{ background: "var(--color-surface-2)" }}>
            <div className="flex items-center justify-between mb-3 gap-3">
              <div>
                <p className="text-[10px] font-700 uppercase tracking-wide flex items-center gap-1.5" style={{ color: "#7c3aed" }}>
                  <Filter size={12} /> If · Lego Builder
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>Drag condition blocks into AND / OR magnetic groups.</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button type="button" onClick={addCond} className="text-[11px] font-700 px-2.5 py-1.5 rounded-lg border border-(--color-border) hover:bg-(--color-surface)" style={{ color: "var(--color-brand)" }}><Plus size={12} className="inline mr-1" /> Condition</button>
                <button type="button" onClick={() => addGroup("all")} className="text-[11px] font-800 px-2.5 py-1.5 rounded-lg" style={{ background: "#dcfce7", color: "#15803d" }}>+ AND Block</button>
                <button type="button" onClick={() => addGroup("any")} className="text-[11px] font-800 px-2.5 py-1.5 rounded-lg" style={{ background: "#fef3c7", color: "#b45309" }}>+ OR Block</button>
              </div>
            </div>

            <div className="space-y-3">
              <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const data = readDragData(e); if (data) moveConditionToLoose(data); }} className="rounded-xl border border-dashed border-(--color-border) p-3" style={{ background: "var(--color-surface)" }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-800 uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Loose conditions</p>
                  {(rule.conditions || []).length > 1 && (
                    <select value={rule.condition_match || "all"} onChange={(e) => patch({ condition_match: e.target.value })} className="px-2 py-1 text-[11px] font-700 rounded-lg border border-(--color-border) outline-none" style={{ background: "var(--color-surface)", color: "var(--color-text-primary)" }}>
                      <option value="all">AND loose conditions</option>
                      <option value="any">OR loose conditions</option>
                    </select>
                  )}
                </div>
                {!(rule.conditions || []).length ? (
                  <p className="text-[11px] py-3 text-center rounded-lg border border-dashed border-(--color-border)" style={{ color: "var(--color-text-muted)" }}>Drop a condition here, or click “Condition”.</p>
                ) : (
                  <div className="space-y-2">
                    {(rule.conditions || []).map((c, i) => renderCondition(c, { key: `loose-${i}`, set: (patchValue) => setCond(i, patchValue), remove: () => removeCond(i), onDragStart: (e) => e.dataTransfer.setData("application/json", JSON.stringify({ source: "loose", index: i })) }))}
                  </div>
                )}
              </div>

              {groups.map((group) => {
                const isOr = group.match === "any";
                return (
                  <div key={group.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const data = readDragData(e); if (data) moveConditionToGroup(data, group.id); }} className="rounded-2xl border-2 border-dashed p-3 transition-all hover:shadow-sm" style={{ background: isOr ? "#fffbeb" : "#f0fdf4", borderColor: isOr ? "#f59e0b55" : "#16a34a55" }}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-900 px-2.5 py-1 rounded-lg" style={{ background: isOr ? "#f59e0b" : "#16a34a", color: "white" }}>{isOr ? "OR" : "AND"}</span>
                        <select value={group.match || "all"} onChange={(e) => updateGroup(group.id, { match: e.target.value })} className="px-2 py-1 text-[11px] font-700 rounded-lg border border-(--color-border) outline-none" style={{ background: "var(--color-surface)", color: "var(--color-text-primary)" }}>
                          <option value="all">All inside must match</option>
                          <option value="any">Any inside can match</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => addCondToGroup(group.id)} className="text-[11px] font-700" style={{ color: "var(--color-brand)" }}><Plus size={12} className="inline mr-1" /> Condition</button>
                        <button type="button" onClick={() => removeGroup(group.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
                      </div>
                    </div>
                    {!(group.conditions || []).length ? (
                      <p className="text-[11px] py-4 text-center rounded-xl border border-dashed" style={{ color: "var(--color-text-muted)", background: "rgba(255,255,255,0.55)", borderColor: isOr ? "#f59e0b55" : "#16a34a55" }}>Magnetic drop zone — drag condition blocks here.</p>
                    ) : (
                      <div className="space-y-2">
                        {(group.conditions || []).map((c, i) => renderCondition(c, { key: `g-${group.id}-${i}`, set: (patchValue) => setGroupCond(group.id, i, patchValue), remove: () => removeGroupCond(group.id, i), onDragStart: (e) => e.dataTransfer.setData("application/json", JSON.stringify({ source: "group", groupId: group.id, index: i })) }))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* THEN (actions) */}
          <div
            className="rounded-xl border border-(--color-border) p-3"
            style={{ background: "var(--color-surface-2)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <p
                className="text-[10px] font-700 uppercase tracking-wide flex items-center gap-1.5"
                style={{ color: "#0ea5e9" }}
              >
                <Workflow size={12} /> Then · do all of these
              </p>
              <button
                type="button"
                onClick={addAction}
                className="text-[11px] font-700 px-2.5 py-1.5 rounded-lg border border-(--color-border) hover:bg-(--color-surface)"
                style={{ color: "var(--color-brand)" }}
              >
                <Plus size={12} className="inline mr-1" /> Action
              </button>
            </div>

            <div className="space-y-2">
              {ruleActionList.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 flex-wrap p-2 rounded-xl border border-(--color-border)"
                  style={{ background: "var(--color-surface)" }}
                >
                  <select
                    value={a.type}
                    onChange={(e) => setActionAt(i, { type: e.target.value, value: "" })}
                    className="px-2 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                    style={{ background: "var(--color-surface)", color: "var(--color-text-primary)" }}
                  >
                    {actionTypes.map((act) => (
                      <option key={act.value} value={act.value}>{act.label}</option>
                    ))}
                  </select>
                  {renderActionValue(a, i)}
                  {ruleActionList.length > 1 && (
                    <button type="button" onClick={() => removeAction(i)} className="p-1 text-gray-400 hover:text-red-500">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RulesPage() {
  const { org, orgId } = useOrg();
  const [rules, setRules] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [addOpen, setAddOpen] = useState(false);

  const stages = (org?.settings?.lead_stages || DEFAULT_LEAD_STAGES).map((s) =>
    typeof s === "string" ? s : s.name,
  );

  useEffect(() => {
    if (!orgId) return;
    // Seed from new rules, else migrate legacy stage_rules
    const existing = org?.settings?.rules;
    if (Array.isArray(existing)) {
      // Migrate legacy single-action rules to an actions[] array.
      setRules(
        existing.map((r) =>
          Array.isArray(r.actions)
            ? r
            : { ...r, actions: r.action ? [r.action] : [], action: undefined },
        ),
      );
    } else if (Array.isArray(org?.settings?.stage_rules)) {
      setRules(
        org.settings.stage_rules.map((r) => ({
          id: r.id || uid(),
          name: "Imported rule",
          enabled: true,
          target: "lead",
          event: r.event,
          conditions: [],
          action: { type: "set_stage", value: r.stage },
        })),
      );
    }
    getTags(orgId)
      .then((t) => setTags(t || []))
      .catch(() => setTags([]))
      .finally(() => setLoading(false));
  }, [orgId, org]);

  const [dirty, setDirty] = useState(false);

  const addRule = (target) => {
    setRules((prev) => [...prev, blankRule(target)]);
    setDirty(true);
  };
  const updateRule = (r) => {
    setRules((prev) => prev.map((x) => (x.id === r.id ? r : x)));
    setDirty(true);
  };
  const removeRule = (id) => {
    if (confirm("Delete this rule?")) {
      setRules((prev) => prev.filter((r) => r.id !== id));
      setDirty(true);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateOrganization(orgId, {
        settings: { ...(org?.settings || {}), rules },
      });
      setSavedAt(Date.now());
      setDirty(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "var(--color-brand-50)" }}
            >
              <Workflow size={16} style={{ color: "var(--color-brand)" }} />
            </div>
            <div>
              <p
                className="text-sm font-600"
                style={{ color: "var(--color-text-primary)" }}
              >
                Automation Rules
              </p>
              <p
                className="text-xs"
                style={{ color: "var(--color-text-muted)" }}
              >
                When an event happens, optionally check conditions, then run an
                action — for leads and patients.
                {saving
                  ? " · Saving…"
                  : dirty
                    ? " · Unsaved changes"
                    : savedAt
                      ? " · Saved"
                      : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              {addOpen && (
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setAddOpen(false)}
                />
              )}
              <Button
                size="sm"
                variant="secondary"
                className="relative z-20"
                onClick={() => setAddOpen((o) => !o)}
              >
                <Plus size={14} /> Add Rule
                <ChevronDown
                  size={13}
                  style={{
                    transform: addOpen ? "rotate(180deg)" : "none",
                    transition: "transform 0.15s",
                  }}
                />
              </Button>
              {addOpen && (
                <div
                  className="absolute top-full right-0 mt-1.5 w-44 rounded-xl border border-(--color-border) overflow-hidden z-20"
                  style={{
                    background: "var(--color-surface)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      addRule("lead");
                      setAddOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-600 text-left transition-colors hover:bg-(--color-surface-2)"
                  >
                    <TrendingUp size={14} style={{ color: "#1d4ed8" }} />{" "}
                    <span style={{ color: "var(--color-text-primary)" }}>
                      Lead rule
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      addRule("patient");
                      setAddOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-600 text-left transition-colors hover:bg-(--color-surface-2)"
                  >
                    <UserRound size={14} style={{ color: "#15803d" }} />{" "}
                    <span style={{ color: "var(--color-text-primary)" }}>
                      Patient rule
                    </span>
                  </button>
                </div>
              )}
            </div>
            <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size={28} />
        </div>
      ) : rules.length === 0 ? (
        <div className="py-20 text-center border border-dashed rounded-2xl border-(--color-border)">
          <Workflow size={32} className="mx-auto mb-3 opacity-20" />
          <p
            className="text-sm font-500"
            style={{ color: "var(--color-text-muted)" }}
          >
            No rules yet.
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: "var(--color-text-muted)" }}
          >
            Add a lead or patient rule to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              stages={stages}
              tags={tags}
              staff={org?.settings?.staff_members || []}
              onChange={updateRule}
              onRemove={() => removeRule(rule.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
