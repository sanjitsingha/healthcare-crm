"use client";
import { useEffect, useState, use, useRef } from "react";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Plus,
  Phone,
  Mail,
  MapPin,
  User,
  Calendar,
  Clock,
  CheckSquare,
  Bell,
  Tag,
  TrendingUp,
  MessageSquare,
  Check,
  X,
  RotateCcw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
} from "lucide-react";
import {
  Button,
  Card,
  Input,
  Select,
  Textarea,
  Spinner,
} from "@/components/ui";
import {
  getLead,
  updateLead,
  deleteLead,
  createActivity,
  getPersonTimeline,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getFollowups,
  createFollowup,
  updateFollowup,
  deleteFollowup,
  createPatient,
  createAppointment,
  getAppointments,
  updateAppointment,
  getTags,
  assignTagToLead,
  removeTagFromLead,
} from "@/lib/supabase/queries";
import { useOrg } from "@/lib/context/OrgContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Timeline from "@/components/crm/Timeline";
import { CustomModuleCard } from "@/components/crm/CustomModule";
import FollowupTable from "@/components/crm/FollowupTable";
import AppointmentList from "@/components/crm/AppointmentList";
import BookAppointmentForm from "@/components/crm/BookAppointmentForm";
import TaskList from "@/components/crm/TaskList";
import CustomDatePicker from "@/components/crm/CustomDatePicker";
import { toast } from "@/lib/toast";
import { showConfirm } from "@/lib/confirm";
import { logAudit, AUDIT } from "@/lib/audit";
import { triggerAutomation } from "@/lib/automations/trigger";
import {
  format,
  formatDistanceToNow,
  isPast,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  addDays,
} from "date-fns";
import clsx from "clsx";

// ── Constants ──────────────────────────────────────────────────
const LEAD_SOURCES = [
  "WhatsApp",
  "Meta Ads",
  "Website",
  "Referral",
  "Call",
  "Email",
  "Walk-in",
  "Event",
  "Other",
];
const LEAD_PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const GENDERS = ["Male", "Female", "Other"];
const BLOOD_GROUPS = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"];

const FOLLOWUP_TYPES = ["Call", "WhatsApp", "Email"];

const FOLLOWUP_STATUS_OPTIONS = {
  Call: [
    "Not Connected",
    "Switched Off",
    "Busy",
    "Not Reachable",
    "Connected - Interested",
    "Connected - Not Interested",
    "Connected - Callback Requested",
    "Wrong Number",
  ],
  WhatsApp: [
    "Sent - No Reply",
    "Delivered - No Reply",
    "Seen - No Reply",
    "Replied - Interested",
    "Replied - Not Interested",
    "Replied - Callback Requested",
    "Number Not on WhatsApp",
  ],
  Email: [
    "Sent - No Reply",
    "Bounced",
    "Opened - No Reply",
    "Replied - Interested",
    "Replied - Not Interested",
    "Replied - Callback Requested",
  ],
};

const TYPE_ICON = {
  Call: Phone,
  WhatsApp: MessageSquare,
  Email: Mail,
  Meeting: Calendar,
  "Site Visit": MapPin,
  Other: Bell,
};

const TYPE_COLOR = {
  Call: { bg: "#dbeafe", color: "#1d4ed8" },
  WhatsApp: { bg: "#dcfce7", color: "#15803d" },
  Email: { bg: "#fce7f3", color: "#be185d" },
  Meeting: { bg: "#f3e8ff", color: "#7c3aed" },
  "Site Visit": { bg: "#fef3c7", color: "#b45309" },
  Other: { bg: "#f3f4f6", color: "#374151" },
};

const STATUS_STYLE = {
  Scheduled: { bg: "#fef3c7", color: "#b45309" },
  Completed: { bg: "#dcfce7", color: "#15803d" },
  Missed: { bg: "#fee2e2", color: "#b91c1c" },
  Rescheduled: { bg: "#f3e8ff", color: "#7c3aed" },
};

const ACTIVITY_ICON = {
  comment: MessageSquare,
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: Edit2,
  status_change: Tag,
  whatsapp: MessageSquare,
};

// ── Custom field components (unchanged) ─────────────────────
function CustomDateTimePicker({ value, onChange, label = "Date & Time *" }) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(value) : new Date();
  const [month, setMonth] = useState(startOfMonth(selected));

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = [];
  let pointer = gridStart;
  while (pointer <= gridEnd) {
    days.push(pointer);
    pointer = new Date(
      pointer.getFullYear(),
      pointer.getMonth(),
      pointer.getDate() + 1,
    );
  }

  const setDatePart = (date) => {
    const next = new Date(date);
    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    onChange(next.toISOString());
  };

  const setTimePart = (key, val) => {
    const next = new Date(selected);
    if (key === "hour") next.setHours(Number(val));
    if (key === "minute") next.setMinutes(Number(val));
    onChange(next.toISOString());
  };

  return (
    <div className="space-y-1.5">
      <label
        className="block text-xs font-500"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full px-3 py-2 rounded-lg border text-left text-sm"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface)",
            color: "var(--color-text-primary)",
          }}
        >
          {format(selected, "MMM d, yyyy · h:mm a")}
        </button>

        {open && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setOpen(false)}
            />
            <div
              className="absolute top-full left-0 mt-1.5 w-68 rounded-xl border p-3 space-y-3 z-20"
              style={{
                borderColor: "var(--color-border)",
                background: "var(--color-surface)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              }}
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="p-1 rounded hover:bg-(--color-surface-2)"
                  onClick={() => setMonth((m) => subMonths(m, 1))}
                >
                  <ChevronLeft size={15} />
                </button>
                <p
                  className="text-sm font-600"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {format(month, "MMMM yyyy")}
                </p>
                <button
                  type="button"
                  className="p-1 rounded hover:bg-(--color-surface-2)"
                  onClick={() => setMonth((m) => addMonths(m, 1))}
                >
                  <ChevronRight size={15} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-0.5 text-[11px] text-center">
                {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => (
                  <span key={day} style={{ color: "var(--color-text-muted)" }}>
                    {day}
                  </span>
                ))}
                {days.map((day, i) => {
                  const active = isSameDay(day, selected);
                  const inMonth = isSameMonth(day, month);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setDatePart(day)}
                      className="py-1.5 rounded text-xs"
                      style={
                        active
                          ? { background: "var(--color-brand)", color: "white" }
                          : {
                              color: inMonth
                                ? "var(--color-text-primary)"
                                : "var(--color-text-muted)",
                            }
                      }
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selected.getHours()}
                  onChange={(e) => setTimePart("hour", e.target.value)}
                  className="flex-1 px-2 py-1.5 rounded-lg border text-sm"
                  style={{
                    borderColor: "var(--color-border)",
                    background: "var(--color-surface)",
                  }}
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, "0")}
                    </option>
                  ))}
                </select>
                <span style={{ color: "var(--color-text-muted)" }}>:</span>
                <select
                  value={selected.getMinutes()}
                  onChange={(e) => setTimePart("minute", e.target.value)}
                  className="flex-1 px-2 py-1.5 rounded-lg border text-sm"
                  style={{
                    borderColor: "var(--color-border)",
                    background: "var(--color-surface)",
                  }}
                >
                  {Array.from({ length: 60 }).map((_, m) => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, "0")}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onChange(new Date().toISOString())}
                >
                  Now
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Follow-up card ─────────────────────────────────────────────
function FollowupCard({ f, onComplete, onMiss, onReschedule }) {
  const [completing, setCompleting] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [outcome, setOutcome] = useState("");
  const [nextType, setNextType] = useState("Call");
  const [nextDate, setNextDate] = useState("");
  const [scheduleNext, setScheduleNext] = useState(false);
  const [saving, setSaving] = useState(false);

  const Icon = TYPE_ICON[f.type] || Bell;
  const typeC = TYPE_COLOR[f.type] || TYPE_COLOR.Other;
  const statC = STATUS_STYLE[f.status] || STATUS_STYLE.Scheduled;
  const overdue = f.status === "Scheduled" && isPast(new Date(f.scheduled_at));

  const handleComplete = async () => {
    setSaving(true);
    try {
      await onComplete(
        f.id,
        outcome,
        scheduleNext ? { type: nextType, scheduled_at: nextDate } : null,
      );
      setCompleting(false);
    } catch (err) {
      toast({ type: "error", title: "Error", message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleReschedule = async () => {
    if (!nextDate) return;
    setSaving(true);
    try {
      await onReschedule(f.id, nextDate, nextType);
      setRescheduling(false);
    } catch (err) {
      toast({ type: "error", title: "Error", message: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="rounded-xl border border-(--color-border) overflow-hidden"
      style={{ background: "var(--color-surface)" }}
    >
      {/* Card header */}
      <div className="flex items-start gap-3 p-4">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: typeC.bg }}
        >
          <Icon size={16} style={{ color: typeC.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-sm font-600"
              style={{ color: "var(--color-text-primary)" }}
            >
              {f.type}
            </span>
            <span
              className="text-[10px] font-600 px-2 py-0.5 rounded-full"
              style={{ background: statC.bg, color: statC.color }}
            >
              {f.status}
            </span>
            {overdue && f.status === "Scheduled" && (
              <span
                className="text-[10px] font-600 px-2 py-0.5 rounded-full"
                style={{ background: "#fee2e2", color: "#b91c1c" }}
              >
                Overdue
              </span>
            )}
          </div>
          <p
            className="text-xs mt-0.5"
            style={{ color: "var(--color-text-muted)" }}
          >
            {format(new Date(f.scheduled_at), "EEE, MMM d yyyy · h:mm a")}
          </p>
          {f.caller_name && (
            <p
              className="text-xs mt-0.5 flex items-center gap-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              <User size={11} /> {f.caller_name}
            </p>
          )}
          {f.notes && (
            <p
              className="text-xs mt-1.5 leading-relaxed"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {f.notes}
            </p>
          )}
          {f.outcome && (
            <div
              className="mt-2 p-2.5 rounded-lg border border-(--color-border)"
              style={{ background: "var(--color-surface-2)" }}
            >
              <p
                className="text-[10px] font-600 uppercase mb-1"
                style={{ color: "var(--color-text-muted)" }}
              >
                Response / Outcome
              </p>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {f.outcome}
              </p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {!completing && !rescheduling && (
          <div className="flex gap-1.5 shrink-0">
            {f.status === "Scheduled" && (
              <>
                <button
                  onClick={() => setCompleting(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 transition-colors"
                  style={{ background: "#dcfce7", color: "#15803d" }}
                >
                  <Check size={12} /> Done
                </button>
                <button
                  onClick={() => {
                    setRescheduling(true);
                    setNextType(f.type);
                    setNextDate("");
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border border-(--color-border) transition-colors hover:bg-(--color-surface-2)"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  <RotateCcw size={11} /> Reschedule
                </button>
                <button
                  onClick={() => onMiss(f.id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border transition-colors hover:bg-red-50"
                  style={{ borderColor: "#fecaca", color: "#b91c1c" }}
                >
                  <X size={11} /> Missed
                </button>
              </>
            )}
            {f.status === "Missed" && (
              <button
                onClick={() => {
                  setRescheduling(true);
                  setNextType(f.type);
                  setNextDate("");
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border border-(--color-border) transition-colors hover:bg-(--color-surface-2)"
                style={{ color: "var(--color-text-muted)" }}
              >
                <RotateCcw size={11} /> Reschedule
              </button>
            )}
          </div>
        )}
      </div>

      {/* Outcome form (inline) */}
      {completing && (
        <div
          className="border-t border-(--color-border) p-4 space-y-3"
          style={{ background: "var(--color-surface-2)" }}
        >
          <p
            className="text-xs font-600"
            style={{ color: "var(--color-text-primary)" }}
          >
            What happened?
          </p>
          <textarea
            rows={3}
            className="w-full px-3 py-2.5 text-sm rounded-lg border border-(--color-border) outline-none resize-none"
            style={{ background: "var(--color-surface)" }}
            placeholder={`Patient's response, what was discussed, next steps...`}
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
          />

          {/* Schedule next toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setScheduleNext((s) => !s)}
              className="flex items-center gap-2 text-xs font-500 px-3 py-1.5 rounded-lg border transition-all"
              style={
                scheduleNext
                  ? {
                      background: "var(--color-brand)",
                      color: "white",
                      borderColor: "var(--color-brand)",
                    }
                  : {
                      color: "var(--color-text-muted)",
                      borderColor: "var(--color-border)",
                    }
              }
            >
              <Plus size={12} /> Schedule next follow-up
            </button>
          </div>

          {scheduleNext && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  className="block text-xs font-500"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Type
                </label>
                <select
                  className="w-full px-3 py-2 text-sm rounded-lg border border-(--color-border) outline-none"
                  style={{ background: "var(--color-surface)" }}
                  value={nextType}
                  onChange={(e) => setNextType(e.target.value)}
                >
                  {FOLLOWUP_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Date & Time"
                type="datetime-local"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
              />
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => setCompleting(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleComplete} disabled={saving}>
              {saving ? (
                "Saving..."
              ) : (
                <>
                  <Check size={13} /> Mark Complete
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Reschedule form (inline) */}
      {rescheduling && (
        <div
          className="border-t border-(--color-border) p-4 space-y-3"
          style={{ background: "var(--color-surface-2)" }}
        >
          <p
            className="text-xs font-600"
            style={{ color: "var(--color-text-primary)" }}
          >
            Reschedule to
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                className="block text-xs font-500"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Type
              </label>
              <select
                className="w-full px-3 py-2 text-sm rounded-lg border border-(--color-border) outline-none"
                style={{ background: "var(--color-surface)" }}
                value={nextType}
                onChange={(e) => setNextType(e.target.value)}
              >
                {FOLLOWUP_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="New Date & Time *"
              type="datetime-local"
              value={nextDate}
              onChange={(e) => setNextDate(e.target.value)}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => setRescheduling(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleReschedule}
              disabled={saving || !nextDate}
            >
              {saving ? (
                "Saving..."
              ) : (
                <>
                  <RotateCcw size={13} /> Reschedule
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function LeadDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { orgId, org, hasPermission } = useOrg();

  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("tasks");

  const [changingStage, setChangingStage] = useState(false);
  const [assigningLead, setAssigningLead] = useState(false);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileDraft, setProfileDraft] = useState({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [infoEditing, setInfoEditing] = useState(false);
  const [infoDraft, setInfoDraft] = useState({});
  const [infoSaving, setInfoSaving] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    priority: "Medium",
    due_date: "",
  });
  const [showFuForm, setShowFuForm] = useState(false);
  const [fuSort, setFuSort] = useState("scheduled_desc");
  const [notesEditing, setNotesEditing] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [showBookForm, setShowBookForm] = useState(false);
  const [bookingSaving, setBookingSaving] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);
  const [addingTag, setAddingTag] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const tagBtnRef = useRef(null);
  const [tagMenuPos, setTagMenuPos] = useState({ top: 0, left: 0 });
  const stageBtnRef = useRef(null);
  const [stageDropPos, setStageDropPos] = useState({ top: 0, left: 0 });

  const logActivity = (type, content) =>
    orgId &&
    createActivity({
      organization_id: orgId,
      entity_type: "lead",
      entity_id: id,
      type,
      content,
      source_page: "lead",
    });

  // Lead timeline is the unified person timeline (this lead + linked patient),
  // shared with the Patient and Consultation pages so it stays in sync.
  // pidOverride lets the conversion handler merge immediately, before `lead`
  // state updates.
  const refreshActivities = async (pidOverride) => {
    const pid = pidOverride ?? lead?.patient_id ?? null;
    setActivities(
      await getPersonTimeline({ patientId: pid, leadIds: [id], orgId }),
    );
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const l = await getLead(id);
      const pid = l?.patient_id || null; // linked patient (after conversion)
      const allIds = new Set([id, pid].filter(Boolean));

      const [mergedActs, t, f, appts, pt, pf] = await Promise.all([
        getPersonTimeline({ patientId: pid, leadIds: [id], orgId }),
        getTasks({ entityType: "lead", entityId: id, orgId }),
        getFollowups({ leadId: id, orgId }),
        getAppointments({ orgId }),
        pid
          ? getTasks({ entityType: "patient", entityId: pid, orgId })
          : Promise.resolve([]),
        pid ? getFollowups({ patientId: pid, orgId }) : Promise.resolve([]),
      ]);

      const mergedTasks = [...(t || []), ...(pt || [])].reduce(
        (acc, x) => (acc.some((y) => y.id === x.id) ? acc : [...acc, x]),
        [],
      );
      const mergedFus = [...(f || []), ...(pf || [])].reduce(
        (acc, x) => (acc.some((y) => y.id === x.id) ? acc : [...acc, x]),
        [],
      );

      setLead(l);
      setActivities(mergedActs);
      setTasks(mergedTasks);
      setFollowups(mergedFus);
      setAppointments(
        (appts || []).filter(
          (ap) => allIds.has(ap.lead_id) || allIds.has(ap.patient_id),
        ),
      );
      try {
        setAvailableTags((await getTags(orgId, "leads")) || []);
      } catch {
        setAvailableTags([]);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, [id]);

  useEffect(() => {
    if (id && orgId)
      logAudit({
        action: AUDIT.LEAD_VIEW,
        entityType: "lead",
        entityId: id,
        description: "Viewed lead record",
      });
  }, [id, orgId]); // eslint-disable-line

  // ── Tag handlers ──
  const linkedTagIds = (lead?.tags || [])
    .map((t) => t.tags?.id)
    .filter(Boolean);
  const unlinkedTags = availableTags.filter(
    (t) => !linkedTagIds.includes(t.id),
  );

  const handleAddTag = async (tagId) => {
    try {
      await assignTagToLead(id, tagId);
      const updated = await getLead(id);
      setLead((prev) => ({ ...prev, tags: updated.tags }));
      const tag = availableTags.find((t) => t.id === tagId);
      await logActivity("tag", `Tag "${tag?.name || "tag"}" added`);
      await refreshActivities();
      logAudit({
        action: AUDIT.TAG_ADD,
        entityType: "lead",
        entityId: id,
        entityName: lead?.title,
        description: `Tag "${tag?.name || tagId}" added to lead`,
      });
      await applyRules("tag_added");
    } catch (err) {
      toast({ type: "error", title: "Error", message: err.message });
    }
  };

  const handleRemoveTag = async (tagId) => {
    try {
      await removeTagFromLead(id, tagId);
      const updated = await getLead(id);
      setLead((prev) => ({ ...prev, tags: updated.tags }));
      const tag = availableTags.find((t) => t.id === tagId);
      await logActivity("tag", `Tag "${tag?.name || "tag"}" removed`);
      await refreshActivities();
      logAudit({
        action: AUDIT.TAG_REMOVE,
        entityType: "lead",
        entityId: id,
        entityName: lead?.title,
        description: `Tag "${tag?.name || tagId}" removed from lead`,
      });
    } catch (err) {
      toast({ type: "error", title: "Error", message: err.message });
    }
  };

  const openTagMenu = () => {
    const r = tagBtnRef.current?.getBoundingClientRect();
    if (r) setTagMenuPos({ top: r.bottom + 6, left: r.left });
    setTagSearch("");
    setAddingTag(true);
  };

  // Close the tag menu on scroll (it's fixed-positioned)
  useEffect(() => {
    if (!addingTag) return;
    const close = () => setAddingTag(false);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [addingTag]);

  // ── Lead handlers ──
  const handleProfileSave = async () => {
    setProfileSaving(true);
    try {
      const before = lead;
      const patch = {
        first_name: profileDraft.first_name || null,
        last_name: profileDraft.last_name || null,
        phone: profileDraft.phone || null,
        email: profileDraft.email || null,
        gender: profileDraft.gender || null,
        date_of_birth: profileDraft.date_of_birth || null,
        address: profileDraft.address || null,
        title:
          [profileDraft.first_name, profileDraft.last_name]
            .filter(Boolean)
            .join(" ")
            .trim() || lead.title,
        custom_data: {
          ...(lead.custom_data || {}),
          blood_group: profileDraft.blood_group || null,
          age: profileDraft.age || null,
          marital_status: profileDraft.marital_status || null,
          city: profileDraft.city || null,
          state: profileDraft.state || null,
          zip_code: profileDraft.zip_code || null,
          occupation: profileDraft.occupation || null,
          alt_phone: profileDraft.alt_phone || null,
          whatsapp_same: !!profileDraft.whatsapp_same,
          whatsapp_phone: (profileDraft.whatsapp_same ? profileDraft.phone : profileDraft.whatsapp_phone) || null,
        },
      };
      const updated = await updateLead(id, patch);
      setLead((prev) => ({ ...prev, ...updated }));
      await logActivity("note", "Profile details updated");
      await refreshActivities();
      setProfileEditing(false);
      logAudit({
        action: AUDIT.LEAD_EDIT,
        entityType: "lead",
        entityId: id,
        entityName: lead?.title,
        description: "Lead profile updated",
      });
      await applyRules("lead_updated", { ...before, ...updated });
    } catch (e) {
      toast({ type: "error", title: "Error", message: e.message });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleInfoSave = async () => {
    setInfoSaving(true);
    try {
      const before = lead;
      const patch = {
        priority: infoDraft.priority || null,
        source: infoDraft.source || null,
        expected_close_date: infoDraft.expected_close_date || null,
      };
      const updated = await updateLead(id, patch);
      setLead((prev) => ({ ...prev, ...updated }));
      await logActivity("note", "Lead info updated");
      await refreshActivities();
      setInfoEditing(false);
      logAudit({
        action: AUDIT.LEAD_EDIT,
        entityType: "lead",
        entityId: id,
        entityName: lead?.title,
        description: "Lead info updated",
      });
      const fresh = { ...before, ...updated };
      await applyRules("lead_updated", fresh);
      if (updated.source !== before?.source)
        await applyRules("source_changed", fresh);
      if (updated.priority !== before?.priority)
        await applyRules("priority_changed", fresh);
    } catch (e) {
      toast({ type: "error", title: "Error", message: e.message });
    } finally {
      setInfoSaving(false);
    }
  };

  const handleDelete = async () => {
    const ok = await showConfirm({
      title: "Delete this lead?",
      message: "This cannot be undone.",
      confirmLabel: "Delete lead",
    });
    if (!ok) return;
    await deleteLead(id);
    router.push("/leads");
  };

  const handleAssignLead = async (memberId) => {
    if (memberId === lead.assigned_to) {
      setAssigningLead(false);
      return;
    }
    try {
      const staff = org?.settings?.staff_members || [];
      const prevMember = staff.find((m) => m.id === lead.assigned_to);
      const updated = await updateLead(id, { assigned_to: memberId || null });
      setLead((prev) => ({ ...prev, assigned_to: updated.assigned_to }));
      const member = staff.find((m) => m.id === memberId);
      await logActivity(
        "note",
        memberId
          ? `Lead assigned to ${member?.name || "team member"}`
          : "Lead unassigned",
      );
      await refreshActivities();
      logAudit({
        action: AUDIT.LEAD_ASSIGN,
        entityType: "lead",
        entityId: id,
        entityName: lead?.title,
        description: memberId
          ? `Assigned to ${member?.name || memberId}`
          : "Lead unassigned",
        before: { assigned_to: prevMember?.name || lead.assigned_to },
        after: { assigned_to: member?.name || memberId || null },
      });
      await applyRules(memberId ? "lead_assigned" : "lead_unassigned", {
        ...lead,
        assigned_to: updated.assigned_to,
      });
    } catch (err) {
      toast({ type: "error", title: "Error", message: err.message });
    }
    setAssigningLead(false);
  };

  const handleStageChange = async (stage) => {
    if (stage === lead.stage) {
      setChangingStage(false);
      return;
    }
    try {
      const prevStage = lead.stage;
      const updated = await updateLead(id, { stage });
      setLead((prev) => ({ ...prev, stage: updated.stage }));
      await logActivity("status_change", `Stage changed to ${stage}`);
      await refreshActivities();
      setChangingStage(false);
      logAudit({
        action: AUDIT.LEAD_STAGE_CHANGE,
        entityType: "lead",
        entityId: id,
        entityName: lead?.title,
        description: `Stage changed: ${prevStage} → ${stage}`,
        before: { stage: prevStage },
        after: { stage },
      });
      await applyRules("stage_changed", null, { stage: prevStage });
    } catch (err) {
      toast({ type: "error", title: "Error", message: err.message });
    }
  };

  // Apply configured automation rules (Settings → Rules) for a lead event.
  // Rules run server-side (single source of truth) so they behave identically
  // whether triggered here, via the API, or via webhooks. We then reload to
  // reflect any changes the rules made (stage, tags, tasks, follow-ups…).
  const applyRules = async (eventKey, entityOverride, prev = null) => {
    if (!orgId || !id) return;
    const res = await triggerAutomation({
      orgId,
      target: "lead",
      event: eventKey,
      entityId: id,
      prev,
    });
    if (res?.ran?.length) await loadAll();
  };

  // Fire "Lead created" rules once for a freshly-created lead (manual create
  // navigates straight here). Webhook-created leads aren't open, so they won't.
  const firedCreatedRef = useRef(false);
  useEffect(() => {
    if (!lead || firedCreatedRef.current) return;
    const ageMs = Date.now() - new Date(lead.created_at).getTime();
    if (ageMs >= 0 && ageMs < 20000) {
      firedCreatedRef.current = true;
      applyRules("lead_created", lead);
    }
  }, [lead]); // eslint-disable-line

  const handleConvertToPatient = async () => {
    if (lead.patient_id) {
      router.push(`/patients/${lead.patient_id}`);
      return;
    }
    const ok = await showConfirm({
      title: "Convert to Patient?",
      message: "Creates a Patient record from this lead.",
      confirmLabel: "Convert",
      variant: "info",
    });
    if (!ok) return;
    try {
      const pat = await createPatient({
        first_name: lead.first_name || lead.title,
        last_name: lead.last_name || null,
        phone: lead.phone || null,
        email: lead.email || null,
        gender: lead.gender || null,
        date_of_birth: lead.date_of_birth || null,
        address: lead.address || null,
        organization_id: orgId,
        assigned_to: lead.assigned_to || null,
      });
      await updateLead(id, { patient_id: pat.id, stage: "Converted" });
      setLead((prev) => ({ ...prev, patient_id: pat.id, stage: "Converted" }));
      // Boundary marker on the lead timeline…
      await logActivity("status_change", `Lead converted to patient`);
      // …and the first entry on the new patient's timeline.
      await createActivity({
        organization_id: orgId,
        entity_type: "patient",
        entity_id: pat.id,
        type: "status_change",
        content: `Converted from lead${lead.title ? `: ${lead.title}` : ""}`,
        source_page: "lead",
      });
      await refreshActivities(pat.id);
      logAudit({
        action: AUDIT.LEAD_CONVERT,
        entityType: "lead",
        entityId: id,
        entityName: lead?.title,
        description: `Lead converted to patient: ${displayName}`,
        after: { patient_id: pat.id, stage: "Converted" },
      });
      toast({
        type: "patient_created",
        title: "Converted to Patient",
        message: `${displayName} is now a patient.`,
      });
      await applyRules("converted_to_patient", {
        ...lead,
        patient_id: pat.id,
        stage: "Converted",
      });
    } catch (err) {
      toast({ type: "error", title: "Error", message: err.message });
    }
  };

  // ── Task handlers ──
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim() || !orgId) return;
    try {
      const t = await createTask({
        ...newTask,
        organization_id: orgId,
        entity_type: "lead",
        entity_id: id,
      });
      setTasks((prev) => [t, ...prev]);
      await logActivity("note", `Task added: ${newTask.title}`);
      await refreshActivities();
      setTaskOpen(false);
      setNewTask({ title: "", priority: "Medium", due_date: "" });
      logAudit({
        action: AUDIT.TASK_CREATE,
        entityType: "lead",
        entityId: id,
        entityName: lead?.title,
        description: `Task created: "${t.title}"`,
        metadata: { task_id: t.id, priority: t.priority, due_date: t.due_date },
      });
      toast({
        type: "task",
        title: "Task Added",
        message: `${displayName}: ${t.title}`,
      });
      await applyRules("task_added");
    } catch (e) {
      toast({ type: "error", title: "Error", message: e.message });
    }
  };

  const handleTaskToggle = async (task) => {
    const newStatus = task.status === "Completed" ? "Pending" : "Completed";
    const updated = await updateTask(task.id, { status: newStatus });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    await logActivity("note", `Task "${task.title}" marked ${newStatus}`);
    await refreshActivities();
    logAudit({
      action: AUDIT.TASK_UPDATE,
      entityType: "lead",
      entityId: id,
      entityName: lead?.title,
      description: `Task "${task.title}" marked ${newStatus}`,
      before: { status: task.status },
      after: { status: newStatus },
    });
    if (newStatus === "Completed") await applyRules("task_completed");
  };

  const handleDeleteTask = async (task) => {
    const ok = await showConfirm({ title: "Delete this task?", confirmLabel: "Delete" });
    if (!ok) return;
    try {
      await deleteTask(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (err) {
      toast({ type: "error", title: "Error", message: err.message });
    }
  };

  // ── Follow-up handlers ──
  const handleCompleteFollowup = async (fuId, outcome, next) => {
    const fu = followups.find((f) => f.id === fuId);
    const updated = await updateFollowup(fuId, {
      status: "Completed",
      outcome: outcome || null,
    });
    setFollowups((prev) => prev.map((f) => (f.id === fuId ? updated : f)));
    await logActivity(
      fu?.type?.toLowerCase() === "call" ? "call" : "note",
      `${fu?.type || "Follow-up"} completed${outcome ? `: ${outcome}` : ""}`,
    );
    logAudit({
      action: AUDIT.FOLLOWUP_UPDATE,
      entityType: "lead",
      entityId: id,
      entityName: lead?.title,
      description: `${fu?.type || "Follow-up"} completed${outcome ? `: ${outcome}` : ""}`,
      before: { status: "Scheduled" },
      after: { status: "Completed", outcome },
    });
    if (next?.scheduled_at) {
      const nf = await createFollowup({
        type: next.type,
        scheduled_at: next.scheduled_at,
        organization_id: orgId,
        lead_id: id,
        patient_id: lead?.patient_id || null,
      });
      setFollowups((prev) => [nf, ...prev]);

      // Auto-create task for next follow-up
      const nt = await createTask({
        title: `Follow-up: ${next.type} on ${format(new Date(next.scheduled_at), "MMM d, h:mm a")}`,
        priority: "Medium",
        due_date: next.scheduled_at,
        status: "Pending",
        organization_id: orgId,
        entity_type: "lead",
        entity_id: id,
      });
      setTasks((prev) => [nt, ...prev]);

      await logActivity(
        "note",
        `Next follow-up scheduled: ${next.type} on ${format(new Date(next.scheduled_at), "MMM d, h:mm a")}`,
      );
    }
    await refreshActivities();
    await applyRules("followup_completed");
  };

  const handleMissFollowup = async (fuId) => {
    const updated = await updateFollowup(fuId, { status: "Missed" });
    setFollowups((prev) => prev.map((f) => (f.id === fuId ? updated : f)));
    const fu = followups.find((f) => f.id === fuId);
    await logActivity(
      "note",
      `Missed: ${fu?.type || "Follow-up"} on ${fu?.scheduled_at ? format(new Date(fu.scheduled_at), "MMM d") : ""}`,
    );
    await refreshActivities();
    await applyRules("followup_missed");
  };

  const handleRescheduleFollowup = async (fuId, newDate, newType) => {
    const updated = await updateFollowup(fuId, {
      status: "Rescheduled",
      scheduled_at: newDate,
      type: newType,
    });
    setFollowups((prev) => prev.map((f) => (f.id === fuId ? updated : f)));
    await logActivity(
      "note",
      `Follow-up rescheduled to ${format(new Date(newDate), "MMM d, h:mm a")}`,
    );
    await refreshActivities();
    await applyRules("followup_rescheduled");
  };

  const handleDeleteFollowup = async (fuId) => {
    const ok = await showConfirm({
      title: "Delete this follow-up?",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    const prev = followups;
    setFollowups((list) => list.filter((f) => f.id !== fuId));
    try {
      await deleteFollowup(fuId);
    } catch (err) {
      setFollowups(prev);
      toast({ type: "error", title: "Error", message: err.message });
    }
  };

  // Inline cell edit from the spreadsheet/table view.
  const handleFollowupField = async (fuId, patch) => {
    const prev = followups.find((f) => f.id === fuId);
    // Optimistic update so the cell reflects instantly.
    setFollowups((list) =>
      list.map((f) => (f.id === fuId ? { ...f, ...patch } : f)),
    );
    try {
      const updated = await updateFollowup(fuId, patch);
      setFollowups((list) => list.map((f) => (f.id === fuId ? updated : f)));
    } catch (err) {
      setFollowups((list) => list.map((f) => (f.id === fuId ? prev : f))); // rollback
      toast({ type: "error", title: "Error", message: err.message });
    }
  };

  // Inline create from the table's empty bottom row.
  const handleCreateFollowupInline = async (patch) => {
    if (!orgId) return;
    try {
      const scheduled_at = patch.scheduled_at || new Date().toISOString();
      const isFuture = new Date(scheduled_at).getTime() > Date.now();
      const f = await createFollowup({
        type: patch.type || "Call",
        scheduled_at,
        notes: patch.notes ?? null,
        outcome: patch.outcome ?? null,
        caller_name: patch.caller_name ?? null,
        status: patch.status || (isFuture ? "Scheduled" : "Completed"),
        organization_id: orgId,
        lead_id: id,
        patient_id: lead?.patient_id || null,
      });
      setFollowups((prev) => [f, ...prev]);
      await logActivity(
        String(f.type).toLowerCase() === "call" ? "call" : "note",
        `${f.type} logged${f.outcome ? `: ${f.outcome}` : ""}`,
      );
      await refreshActivities();
      toast({
        type: "followup",
        title: `${f.type} logged`,
        message: `${displayName}${f.outcome ? ` — ${f.outcome}` : ""}`,
      });
      await applyRules("followup_logged");
    } catch (err) {
      toast({ type: "error", title: "Error", message: err.message });
    }
  };

  const handleSaveNotes = async () => {
    setNotesSaving(true);
    try {
      const updated = await updateLead(id, { description: notesDraft || null });
      setLead((prev) => ({ ...prev, description: updated.description }));
      await logActivity("note", "Notes updated");
      await refreshActivities();
      setNotesEditing(false);
      logAudit({
        action: AUDIT.NOTE_ADD,
        entityType: "lead",
        entityId: id,
        entityName: lead?.title,
        description: "Lead notes updated",
      });
      await applyRules("note_updated", {
        ...lead,
        description: updated.description,
      });
    } catch (err) {
      toast({ type: "error", title: "Error", message: err.message });
    } finally {
      setNotesSaving(false);
    }
  };

  const handleApptStatus = async (aid, status) => {
    try {
      const u = await updateAppointment(aid, { status });
      setAppointments((prev) => prev.map((a) => (a.id === aid ? { ...a, ...u } : a)));
    } catch (err) {
      toast({ type: "error", title: "Error", message: err.message });
    }
  };

  const handleApptPayment = async (aid, patch) => {
    try {
      const u = await updateAppointment(aid, patch);
      setAppointments((prev) => prev.map((a) => (a.id === aid ? { ...a, ...u } : a)));
    } catch (err) {
      toast({ type: "error", title: "Error", message: err.message });
    }
  };

  const handleApptReschedule = async (aid, iso) => {
    try {
      const updated = await updateAppointment(aid, { scheduled_at: iso, status: "booked" });
      setAppointments((prev) => prev.map((a) => (a.id === aid ? updated : a)));
      await logActivity(
        "meeting",
        `Appointment rescheduled to ${format(new Date(iso), "MMM d, yyyy")}`,
      );
      await refreshActivities();
    } catch (err) {
      toast({ type: "error", title: "Error", message: err.message });
    }
  };

  const handleBookAppointment = async (data) => {
    if (!data.scheduled_at || !orgId) return;
    setBookingSaving(true);
    try {
      let patientId = lead.patient_id;
      if (!patientId) {
        const nameParts = (data.name || "").trim().split(/\s+/);
        const pat = await createPatient({
          first_name: nameParts[0] || lead.first_name || lead.title,
          last_name: nameParts.slice(1).join(" ") || lead.last_name || null,
          phone: data.phone || lead.phone || null,
          email: lead.email || null,
          gender: lead.gender || null,
          date_of_birth: lead.date_of_birth || null,
          address: lead.address || null,
          organization_id: orgId,
          assigned_to: lead.assigned_to || null,
        });
        await updateLead(id, { patient_id: pat.id });
        setLead((prev) => ({ ...prev, patient_id: pat.id }));
        patientId = pat.id;
        await createActivity({
          organization_id: orgId,
          entity_type: "patient",
          entity_id: pat.id,
          type: "status_change",
          content: `Converted from lead${lead.title ? `: ${lead.title}` : ""}`,
          source_page: "lead",
        });
      }
      const appt = await createAppointment({
        organization_id: orgId,
        patient_id: patientId,
        lead_id: id,
        scheduled_at: data.scheduled_at,
        doctor_id: data.doctor_id,
        notes: data.notes,
        status: "booked",
        consultation_fee: data.consultation_fee,
        consultation_fee_status: data.consultation_fee_status,
        payment_mode: data.payment_mode,
      });
      setAppointments((prev) => [appt, ...prev]);

      // Reminder tasks are now configured via Settings → Workflow Rules
      // (Appointment booked → create task, N days before scheduled_at).
      const apptDate = new Date(data.scheduled_at);

      await logActivity(
        "meeting",
        `Appointment booked for ${format(apptDate, "MMM d, yyyy")}`,
      );
      await refreshActivities(patientId);
      const apptDoctor = doctors.find((d) => d.id === data.doctor_id);
      toast({
        type: "appointment",
        title: "Appointment Booked",
        message: `${data.name || displayName} on ${format(apptDate, "MMM d, h:mm a")}${apptDoctor ? ` with ${apptDoctor.name}` : ""}`,
      });
      setShowBookForm(false);
      // Event-based automation (configured in Settings → Rules)
      await applyRules("appointment_booked");
    } catch (err) {
      toast({ type: "error", title: "Error", message: err.message });
    } finally {
      setBookingSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size={32} />
      </div>
    );
  if (!lead)
    return (
      <div
        className="p-12 text-center text-sm"
        style={{ color: "var(--color-text-muted)" }}
      >
        Lead not found
      </div>
    );

  const pat = lead.patients;
  const displayName =
    [lead.first_name || pat?.first_name, lead.last_name || pat?.last_name]
      .filter(Boolean)
      .join(" ") || lead.title;
  const displayPhone = lead.phone || pat?.phone || null;
  const displayEmail = lead.email || pat?.email || null;
  const displayGender = lead.gender || pat?.gender || null;
  const displayDOB = lead.date_of_birth || pat?.date_of_birth || null;
  const displayAddr = lead.address || pat?.address || null;

  const stages = (org?.settings?.lead_stages || []).map((s) =>
    typeof s === "string" ? { name: s, color: "#6366f1" } : s,
  );
  const stageC = stages.find((s) => s.name === lead.stage)?.color || "#6366f1";
  const staffMembers = org?.settings?.staff_members || [];
  const doctors = org?.settings?.doctors || [];
  const assignee = lead.assigned_to
    ? staffMembers.find((m) => m.id === lead.assigned_to)
    : null;
  const pendingTasks = tasks.filter((t) => t.status === "Pending").length;

  const TABS = [
    { id: "tasks", label: "Tasks", icon: CheckSquare, count: pendingTasks },
    { id: "timeline", label: "Timeline", icon: Clock },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      {/* Sticky header */}
      <div
        className="sticky top-0 z-30 px-6 py-4 border-b border-(--color-border) flex items-center justify-between"
        style={{ background: "var(--color-surface)" }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/leads"
            className="flex items-center gap-1.5 text-sm hover:opacity-60 transition-opacity"
            style={{ color: "var(--color-text-muted)" }}
          >
            <ArrowLeft size={16} /> Leads
          </Link>
          <span style={{ color: "var(--color-border)" }}>/</span>
          <span
            className="text-sm font-600 truncate max-w-xs"
            style={{ color: "var(--color-text-primary)" }}
          >
            {displayName}
          </span>

          {/* Stage pill with dropdown */}
          <div className="relative shrink-0">
            {changingStage && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setChangingStage(false)}
              />
            )}
            <button
              ref={stageBtnRef}
              type="button"
              onClick={() => {
                const r = stageBtnRef.current?.getBoundingClientRect();
                if (r) setStageDropPos({ top: r.bottom + 6, left: r.left });
                setChangingStage((s) => !s);
              }}
              className="flex items-center gap-1.5 text-[11px] font-700 px-2.5 py-1 rounded-md transition-opacity hover:opacity-85"
              style={{ background: stageC + "22", color: stageC }}
            >
              {lead.stage}
              <ChevronDown
                size={12}
                style={{
                  transform: changingStage ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.15s",
                }}
              />
            </button>
            {changingStage && (
              <div
                className="fixed w-44 rounded-xl border border-(--color-border) overflow-hidden z-[9999]"
                style={{
                  top: stageDropPos.top,
                  left: stageDropPos.left,
                  background: "var(--color-surface)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                }}
              >
                {stages.map(({ name, color }) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleStageChange(name)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-600 text-left transition-colors hover:bg-(--color-surface-2)"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span
                      className="flex-1"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {name}
                    </span>
                    {name === lead.stage && (
                      <Check size={12} style={{ color, flexShrink: 0 }} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Assign Lead */}
          <div className="relative">
            {assigningLead && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setAssigningLead(false)}
              />
            )}
            <button
              type="button"
              onClick={() => setAssigningLead((s) => !s)}
              className="relative z-50 flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-600 transition-colors hover:bg-(--color-surface-2)"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-text-secondary)",
                background: "var(--color-surface)",
              }}
            >
              {assignee ? (
                <>
                  <span
                    className="w-5 h-5 rounded-full text-[10px] font-700 flex items-center justify-center shrink-0"
                    style={{
                      background: "var(--color-brand-50)",
                      color: "var(--color-brand)",
                    }}
                  >
                    {assignee.name[0].toUpperCase()}
                  </span>
                  <span className="max-w-24 truncate">{assignee.name}</span>
                </>
              ) : (
                <>
                  <User size={13} />
                  Assign Lead
                </>
              )}
              <ChevronDown
                size={12}
                style={{
                  transform: assigningLead ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.15s",
                }}
              />
            </button>

            {assigningLead && (
              <div
                className="absolute top-full right-0 mt-1.5 w-52 rounded-xl border border-(--color-border) overflow-hidden z-50"
                style={{
                  background: "var(--color-surface)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                }}
              >
                <div className="px-3 py-2 border-b border-(--color-border)">
                  <p
                    className="text-[10px] font-600 uppercase tracking-wide"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Assign to
                  </p>
                </div>
                {staffMembers.length === 0 ? (
                  <p
                    className="px-3 py-3 text-xs"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    No team members yet. Add them in Settings → People.
                  </p>
                ) : (
                  <>
                    {staffMembers.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleAssignLead(m.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-500 text-left transition-colors hover:bg-(--color-surface-2)"
                      >
                        <span
                          className="w-6 h-6 rounded-full text-[10px] font-700 flex items-center justify-center shrink-0"
                          style={{
                            background: "var(--color-brand-50)",
                            color: "var(--color-brand)",
                          }}
                        >
                          {m.name[0].toUpperCase()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p
                            className="truncate"
                            style={{ color: "var(--color-text-primary)" }}
                          >
                            {m.name}
                          </p>
                          {m.designation && (
                            <p
                              className="text-[10px] truncate"
                              style={{ color: "var(--color-text-muted)" }}
                            >
                              {m.designation}
                            </p>
                          )}
                        </div>
                        {lead.assigned_to === m.id && (
                          <Check
                            size={12}
                            style={{
                              color: "var(--color-brand)",
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </button>
                    ))}
                    {lead.assigned_to && (
                      <>
                        <div className="border-t border-(--color-border)" />
                        <button
                          type="button"
                          onClick={() => handleAssignLead(null)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-500 text-left transition-colors hover:bg-red-50"
                          style={{ color: "#b91c1c" }}
                        >
                          <X size={13} />
                          Unassign
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {hasPermission("leads.delete") && (
            <button
              onClick={handleDelete}
              className="p-2 rounded-lg border border-(--color-border) hover:bg-red-50 hover:border-red-200 transition-colors"
            >
              <Trash2 size={15} className="text-red-500" />
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-3 gap-5 items-start">
          {/* ── Left col ── */}
          <div className="space-y-4">
            {/* Lead Profile */}
            <Card className="p-5 border-(--color-border)">
              <div className="flex items-center justify-between mb-4">
                <p
                  className="text-[10px] font-700 uppercase tracking-widest"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Lead Profile
                </p>
                {!profileEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfileDraft({
                        first_name: lead.first_name || "",
                        last_name: lead.last_name || "",
                        phone: displayPhone || "",
                        email: displayEmail || "",
                        gender: displayGender || "",
                        date_of_birth: displayDOB || "",
                        address: displayAddr || "",
                        blood_group: lead.custom_data?.blood_group || "",
                        age: lead.custom_data?.age || "",
                        marital_status: lead.custom_data?.marital_status || "",
                        city: lead.custom_data?.city || "",
                        state: lead.custom_data?.state || "",
                        zip_code: lead.custom_data?.zip_code || "",
                        occupation: lead.custom_data?.occupation || "",
                        alt_phone: lead.custom_data?.alt_phone || "",
                        whatsapp_phone: lead.custom_data?.whatsapp_phone || "",
                        whatsapp_same: !!lead.custom_data?.whatsapp_same,
                      });
                      setProfileEditing(true);
                    }}
                    className="p-1.5 -m-1.5 rounded-lg transition-colors hover:bg-(--color-brand-50)"
                    title="Edit profile"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <Edit2 size={13} />
                  </button>
                )}
              </div>

              {profileEditing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label
                        className="block text-[10px] font-500"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        First name
                      </label>
                      <input
                        type="text"
                        value={profileDraft.first_name}
                        onChange={(e) =>
                          setProfileDraft((d) => ({
                            ...d,
                            first_name: e.target.value,
                          }))
                        }
                        placeholder="First name"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                        style={{
                          background: "var(--color-surface)",
                          color: "var(--color-text-primary)",
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label
                        className="block text-[10px] font-500"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        Last name
                      </label>
                      <input
                        type="text"
                        value={profileDraft.last_name}
                        onChange={(e) =>
                          setProfileDraft((d) => ({
                            ...d,
                            last_name: e.target.value,
                          }))
                        }
                        placeholder="Last name"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                        style={{
                          background: "var(--color-surface)",
                          color: "var(--color-text-primary)",
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label
                      className="block text-[10px] font-500"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={profileDraft.phone}
                      onChange={(e) =>
                        setProfileDraft((d) => ({
                          ...d,
                          phone: e.target.value,
                        }))
                      }
                      placeholder="Phone number"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                      style={{
                        background: "var(--color-surface)",
                        color: "var(--color-text-primary)",
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      className="block text-[10px] font-500"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      value={profileDraft.email}
                      onChange={(e) =>
                        setProfileDraft((d) => ({
                          ...d,
                          email: e.target.value,
                        }))
                      }
                      placeholder="Email address"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                      style={{
                        background: "var(--color-surface)",
                        color: "var(--color-text-primary)",
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label
                        className="block text-[10px] font-500"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        Date of birth
                      </label>
                      <CustomDatePicker
                        popover
                        compact
                        placeholder="Pick a date"
                        value={
                          profileDraft.date_of_birth
                            ? profileDraft.date_of_birth.slice(0, 10)
                            : ""
                        }
                        onChange={(v) =>
                          setProfileDraft((d) => ({ ...d, date_of_birth: v }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label
                        className="block text-[10px] font-500"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        Gender
                      </label>
                      <select
                        value={profileDraft.gender}
                        onChange={(e) =>
                          setProfileDraft((d) => ({
                            ...d,
                            gender: e.target.value,
                          }))
                        }
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                        style={{
                          background: "var(--color-surface)",
                          color: "var(--color-text-primary)",
                        }}
                      >
                        <option value="">—</option>
                        {GENDERS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label
                      className="block text-[10px] font-500"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Address
                    </label>
                    <input
                      type="text"
                      value={profileDraft.address}
                      onChange={(e) =>
                        setProfileDraft((d) => ({
                          ...d,
                          address: e.target.value,
                        }))
                      }
                      placeholder="Full address"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                      style={{
                        background: "var(--color-surface)",
                        color: "var(--color-text-primary)",
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      className="block text-[10px] font-500"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Blood group
                    </label>
                    <select
                      value={profileDraft.blood_group}
                      onChange={(e) =>
                        setProfileDraft((d) => ({
                          ...d,
                          blood_group: e.target.value,
                        }))
                      }
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                      style={{
                        background: "var(--color-surface)",
                        color: "var(--color-text-primary)",
                      }}
                    >
                      <option value="">—</option>
                      {BLOOD_GROUPS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-500" style={{ color: "var(--color-text-muted)" }}>Age</label>
                      <input type="number" min="0" value={profileDraft.age}
                        onChange={(e) => setProfileDraft((d) => ({ ...d, age: e.target.value }))}
                        placeholder="Age"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                        style={{ background: "var(--color-surface)", color: "var(--color-text-primary)" }} />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-500" style={{ color: "var(--color-text-muted)" }}>Marital status</label>
                      <select value={profileDraft.marital_status}
                        onChange={(e) => setProfileDraft((d) => ({ ...d, marital_status: e.target.value }))}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                        style={{ background: "var(--color-surface)", color: "var(--color-text-primary)" }}>
                        <option value="">—</option>
                        {["Single", "Married", "Divorced", "Widowed", "Other"].map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-500" style={{ color: "var(--color-text-muted)" }}>Occupation</label>
                    <input type="text" value={profileDraft.occupation}
                      onChange={(e) => setProfileDraft((d) => ({ ...d, occupation: e.target.value }))}
                      placeholder="Occupation"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                      style={{ background: "var(--color-surface)", color: "var(--color-text-primary)" }} />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-500" style={{ color: "var(--color-text-muted)" }}>City</label>
                      <input type="text" value={profileDraft.city}
                        onChange={(e) => setProfileDraft((d) => ({ ...d, city: e.target.value }))}
                        placeholder="City"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                        style={{ background: "var(--color-surface)", color: "var(--color-text-primary)" }} />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-500" style={{ color: "var(--color-text-muted)" }}>State</label>
                      <input type="text" value={profileDraft.state}
                        onChange={(e) => setProfileDraft((d) => ({ ...d, state: e.target.value }))}
                        placeholder="State"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                        style={{ background: "var(--color-surface)", color: "var(--color-text-primary)" }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-500" style={{ color: "var(--color-text-muted)" }}>Zip code</label>
                      <input type="text" value={profileDraft.zip_code}
                        onChange={(e) => setProfileDraft((d) => ({ ...d, zip_code: e.target.value }))}
                        placeholder="Zip code"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                        style={{ background: "var(--color-surface)", color: "var(--color-text-primary)" }} />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-500" style={{ color: "var(--color-text-muted)" }}>Alternative phone</label>
                      <input type="tel" value={profileDraft.alt_phone}
                        onChange={(e) => setProfileDraft((d) => ({ ...d, alt_phone: e.target.value }))}
                        placeholder="Alternative phone"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                        style={{ background: "var(--color-surface)", color: "var(--color-text-primary)" }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-500" style={{ color: "var(--color-text-muted)" }}>WhatsApp number</label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-500" style={{ color: "var(--color-text-muted)" }}>
                        <input type="checkbox" checked={!!profileDraft.whatsapp_same}
                          onChange={(e) => setProfileDraft((d) => ({ ...d, whatsapp_same: e.target.checked, whatsapp_phone: e.target.checked ? d.phone : d.whatsapp_phone }))}
                          className="w-3.5 h-3.5 cursor-pointer" style={{ accentColor: "var(--color-brand)" }} />
                        Same as primary
                      </label>
                    </div>
                    <input type="tel"
                      value={profileDraft.whatsapp_same ? profileDraft.phone : profileDraft.whatsapp_phone}
                      disabled={profileDraft.whatsapp_same}
                      onChange={(e) => setProfileDraft((d) => ({ ...d, whatsapp_phone: e.target.value }))}
                      placeholder="WhatsApp number"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none disabled:opacity-60"
                      style={{ background: "var(--color-surface)", color: "var(--color-text-primary)" }} />
                  </div>

                  <div className="flex gap-2 justify-end pt-1 border-t border-(--color-border)">
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      onClick={() => setProfileEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      onClick={handleProfileSave}
                      disabled={profileSaving}
                    >
                      {profileSaving ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-800 shrink-0"
                      style={{
                        background: "var(--color-brand-50)",
                        color: "var(--color-brand)",
                      }}
                    >
                      {(displayName[0] || "?").toUpperCase()}
                      {displayName.split(" ")[1]?.[0]?.toUpperCase() || ""}
                    </div>
                    <div className="min-w-0">
                      <p
                        className="text-sm font-700 truncate"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {displayName}
                      </p>
                      {displayGender && (
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {displayGender}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="mb-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(lead.tags || [])
                        .map((t) => t.tags)
                        .filter(Boolean)
                        .map((tag) => {
                          const tc = tag.color || "#6366f1";
                          return (
                            <span
                              key={tag.id}
                              className="relative inline-flex items-center gap-1.5 pl-4 pr-2.5 py-1 text-xs font-600"
                              style={{
                                background: tc,
                                color: "white",
                                clipPath:
                                  "polygon(9px 0, 100% 0, 100% 100%, 9px 100%, 0 50%)",
                              }}
                            >
                              <span
                                className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                                style={{ background: "rgba(255,255,255,0.85)" }}
                              />
                              {tag.name}
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(tag.id)}
                                className="opacity-70 hover:opacity-100 transition-opacity"
                              >
                                <X size={11} />
                              </button>
                            </span>
                          );
                        })}
                      <button
                        ref={tagBtnRef}
                        type="button"
                        onClick={() =>
                          addingTag ? setAddingTag(false) : openTagMenu()
                        }
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-dashed text-[10px] font-600 transition-colors hover:bg-(--color-surface-2)"
                        style={{
                          borderColor: "var(--color-border)",
                          color: "var(--color-text-muted)",
                        }}
                      >
                        <Plus size={10} /> Add Tag
                      </button>
                      {addingTag && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setAddingTag(false)}
                          />
                          <div
                            className="fixed w-56 rounded-lg border border-(--color-border) overflow-hidden z-50"
                            style={{
                              top: tagMenuPos.top,
                              left: tagMenuPos.left,
                              background: "var(--color-surface)",
                              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                            }}
                          >
                            <div className="p-2 border-b border-(--color-border)">
                              <div className="relative">
                                <Search
                                  size={12}
                                  className="absolute left-2 top-1/2 -translate-y-1/2"
                                  style={{ color: "var(--color-text-muted)" }}
                                />
                                <input
                                  autoFocus
                                  value={tagSearch}
                                  onChange={(e) => setTagSearch(e.target.value)}
                                  placeholder="Search tags…"
                                  className="w-full pl-7 pr-2 py-1.5 text-xs rounded-md border border-(--color-border) outline-none"
                                  style={{
                                    background: "var(--color-surface)",
                                    color: "var(--color-text-primary)",
                                  }}
                                />
                              </div>
                            </div>
                            <div className="max-h-52 overflow-y-auto py-1">
                              {unlinkedTags.filter((t) =>
                                t.name
                                  .toLowerCase()
                                  .includes(tagSearch.toLowerCase()),
                              ).length === 0 ? (
                                <p
                                  className="px-3 py-3 text-[11px] text-center"
                                  style={{ color: "var(--color-text-muted)" }}
                                >
                                  {availableTags.length === 0
                                    ? "No lead tags. Create them in Settings → Tags."
                                    : "No matching tags."}
                                </p>
                              ) : (
                                unlinkedTags
                                  .filter((t) =>
                                    t.name
                                      .toLowerCase()
                                      .includes(tagSearch.toLowerCase()),
                                  )
                                  .map((tag) => (
                                    <button
                                      key={tag.id}
                                      type="button"
                                      onClick={() => handleAddTag(tag.id)}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-(--color-surface-2)"
                                    >
                                      <span
                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                        style={{ background: tag.color }}
                                      />
                                      <span
                                        className="flex-1 truncate"
                                        style={{
                                          color: "var(--color-text-primary)",
                                        }}
                                      >
                                        {tag.name}
                                      </span>
                                      <Plus
                                        size={11}
                                        style={{
                                          color: "var(--color-text-muted)",
                                        }}
                                      />
                                    </button>
                                  ))
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      { icon: Phone, label: displayPhone || "—" },
                      ...(lead.custom_data?.alt_phone ? [{ icon: Phone, label: `Alt: ${lead.custom_data.alt_phone}` }] : []),
                      ...(lead.custom_data?.whatsapp_phone ? [{ icon: Phone, label: `WhatsApp: ${lead.custom_data.whatsapp_phone}` }] : []),
                      { icon: Mail, label: displayEmail || "—" },
                      {
                        icon: User,
                        label: displayDOB
                          ? `DOB: ${format(new Date(displayDOB), "MMM d, yyyy")}`
                          : "DOB: —",
                      },
                      ...(lead.custom_data?.age ? [{ icon: Calendar, label: `Age: ${lead.custom_data.age}` }] : []),
                      ...(lead.custom_data?.marital_status ? [{ icon: User, label: lead.custom_data.marital_status }] : []),
                      ...(lead.custom_data?.occupation ? [{ icon: User, label: lead.custom_data.occupation }] : []),
                      { icon: MapPin, label: displayAddr || "—" },
                      ...((lead.custom_data?.city || lead.custom_data?.state || lead.custom_data?.zip_code)
                        ? [{ icon: MapPin, label: [lead.custom_data.city, lead.custom_data.state, lead.custom_data.zip_code].filter(Boolean).join(", ") }]
                        : []),
                      {
                        icon: Tag,
                        label: lead.custom_data?.blood_group
                          ? `Blood: ${lead.custom_data.blood_group}`
                          : "Blood: —",
                      },
                    ].map(({ icon: Icon, label }, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Icon
                          size={13}
                          style={{
                            color: "var(--color-text-muted)",
                            flexShrink: 0,
                          }}
                        />
                        <span
                          className="text-xs truncate"
                          style={{
                            color: label.endsWith("—")
                              ? "var(--color-text-muted)"
                              : "var(--color-text-secondary)",
                          }}
                        >
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div
                className={
                  profileEditing
                    ? "hidden"
                    : "mt-4 pt-4 border-t border-(--color-border)"
                }
              >
                {lead.patient_id ? (
                  <div className="space-y-2">
                    <div
                      className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-600"
                      style={{ background: "#dcfce7", color: "#15803d" }}
                    >
                      <Check size={12} /> Converted to Patient
                    </div>
                    <Link
                      href={`/patients/${lead.patient_id}`}
                      className="flex items-center justify-center gap-2 text-xs font-600 py-2 rounded-lg border border-(--color-border) transition-colors hover:bg-(--color-brand-50)"
                      style={{ color: "var(--color-brand)" }}
                    >
                      <User size={13} /> View Patient Profile
                    </Link>
                  </div>
                ) : (
                  <button
                    onClick={handleConvertToPatient}
                    className="w-full flex items-center justify-center gap-2 text-xs font-600 py-2 rounded-lg transition-all hover:opacity-90"
                    style={{ background: "var(--color-brand)", color: "white" }}
                  >
                    <User size={13} /> Convert to Patient
                  </button>
                )}
              </div>
            </Card>

            {/* Lead Info */}
            <Card className="p-5 border-(--color-border)">
              <div className="flex items-center justify-between mb-4">
                <p
                  className="text-[10px] font-700 uppercase tracking-widest"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Lead Info
                </p>
                {!infoEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setInfoDraft({
                        priority: lead.priority || "",
                        source: lead.source || "",
                        expected_close_date: lead.expected_close_date || "",
                      });
                      setInfoEditing(true);
                    }}
                    className="p-1.5 -m-1.5 rounded-lg transition-colors hover:bg-(--color-brand-50)"
                    title="Edit info"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <Edit2 size={13} />
                  </button>
                )}
              </div>

              {infoEditing ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label
                      className="block text-[10px] font-500"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Priority
                    </label>
                    <select
                      value={infoDraft.priority}
                      onChange={(e) =>
                        setInfoDraft((d) => ({
                          ...d,
                          priority: e.target.value,
                        }))
                      }
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                      style={{
                        background: "var(--color-surface)",
                        color: "var(--color-text-primary)",
                      }}
                    >
                      <option value="">—</option>
                      {LEAD_PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label
                      className="block text-[10px] font-500"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Source
                    </label>
                    <select
                      value={infoDraft.source}
                      onChange={(e) =>
                        setInfoDraft((d) => ({ ...d, source: e.target.value }))
                      }
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-(--color-border) outline-none"
                      style={{
                        background: "var(--color-surface)",
                        color: "var(--color-text-primary)",
                      }}
                    >
                      <option value="">—</option>
                      {LEAD_SOURCES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label
                      className="block text-[10px] font-500"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Expected close date
                    </label>
                    <CustomDatePicker
                      popover
                      compact
                      placeholder="Expected close date"
                      value={
                        infoDraft.expected_close_date
                          ? infoDraft.expected_close_date.slice(0, 10)
                          : ""
                      }
                      onChange={(v) =>
                        setInfoDraft((d) => ({ ...d, expected_close_date: v }))
                      }
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-1 border-t border-(--color-border)">
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      onClick={() => setInfoEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      onClick={handleInfoSave}
                      disabled={infoSaving}
                    >
                      {infoSaving ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    {
                      label: "Priority",
                      value: lead.priority || "—",
                      icon: Tag,
                    },
                    {
                      label: "Source",
                      value: lead.source || "—",
                      icon: TrendingUp,
                    },
                    {
                      label: "Created",
                      value: format(new Date(lead.created_at), "MMM d, yyyy"),
                      icon: Clock,
                    },
                    {
                      label: "Expected Close",
                      value: lead.expected_close_date
                        ? format(
                            new Date(lead.expected_close_date),
                            "MMM d, yyyy",
                          )
                        : "—",
                      icon: Calendar,
                    },
                    ...(lead.custom_data?.reason
                      ? [
                          {
                            label: "Reason",
                            value: lead.custom_data.reason,
                            icon: Tag,
                          },
                        ]
                      : []),
                    ...(lead.custom_data?.department
                      ? [
                          {
                            label: "Department",
                            value: lead.custom_data.department,
                            icon: Tag,
                          },
                        ]
                      : []),
                    ...(lead.custom_data?.referred_by
                      ? [
                          {
                            label: "Referred by",
                            value: lead.custom_data.referred_by,
                            icon: User,
                          },
                        ]
                      : []),
                  ].map(({ label, value, icon: Icon }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Icon
                          size={13}
                          style={{ color: "var(--color-text-muted)" }}
                        />
                        <span
                          className="text-xs"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          {label}
                        </span>
                      </div>
                      <span
                        className="text-xs font-600"
                        style={{
                          color:
                            value === "—"
                              ? "var(--color-text-muted)"
                              : "var(--color-text-primary)",
                        }}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Custom modules */}
            {(org?.settings?.modules || [])
              .filter((m) => m.page === "leads" && m.active)
              .map((m) => (
                <CustomModuleCard
                  key={m.id}
                  module={m}
                  data={lead?.custom_data?.[m.id] || {}}
                  onSave={async (values) => {
                    const custom_data = {
                      ...(lead.custom_data || {}),
                      [m.id]: values,
                    };
                    const updated = await updateLead(id, { custom_data });
                    setLead((prev) => ({
                      ...prev,
                      custom_data: updated.custom_data,
                    }));
                    await logActivity("note", `${m.name} details updated`);
                    await refreshActivities();
                  }}
                />
              ))}
          </div>

          {/* ── Right col ── */}
          <div className="col-span-2 space-y-5">
            <Card className="border-(--color-border) overflow-hidden">
              {/* Tab bar */}
              <div
                className="flex items-center justify-between border-b border-(--color-border)"
                style={{ background: "var(--color-surface-2)" }}
              >
                <div className="flex">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={clsx(
                        "flex items-center gap-2 px-5 py-3.5 text-xs font-600 border-b-2 transition-all",
                        activeTab === tab.id
                          ? "border-(--color-brand) bg-(--color-surface)"
                          : "border-transparent hover:bg-(--color-surface)",
                      )}
                      style={
                        activeTab === tab.id
                          ? { color: "var(--color-brand)" }
                          : { color: "var(--color-text-muted)" }
                      }
                    >
                      <tab.icon size={14} />
                      {tab.label}
                      {tab.count > 0 && (
                        <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                {activeTab === "tasks" && !taskOpen && (
                  <Button
                    size="sm"
                    className="mr-3 shrink-0"
                    onClick={() => setTaskOpen(true)}
                  >
                    <Plus size={14} /> New Task
                  </Button>
                )}
              </div>

              <div className="p-3 max-h-140 overflow-y-auto">
                {/* ── Tasks ── */}
                {activeTab === "tasks" && (
                  <div className="space-y-2">
                    {taskOpen && (
                      <form
                        onSubmit={handleCreateTask}
                        className="p-4 rounded-xl border border-(--color-border) space-y-3"
                        style={{ background: "var(--color-surface-2)" }}
                      >
                        <Input
                          label="Task *"
                          placeholder="e.g. Send treatment plan, Follow up on insurance"
                          value={newTask.title}
                          onChange={(e) =>
                            setNewTask((f) => ({ ...f, title: e.target.value }))
                          }
                          required
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <Select
                            label="Priority"
                            value={newTask.priority}
                            onChange={(e) =>
                              setNewTask((f) => ({
                                ...f,
                                priority: e.target.value,
                              }))
                            }
                            options={["Low", "Medium", "High", "Urgent"].map(
                              (s) => ({ value: s, label: s }),
                            )}
                          />
                          <div className="space-y-1.5">
                            <label className="block text-xs font-500" style={{ color: "var(--color-text-secondary)" }}>
                              Due Date
                            </label>
                            <CustomDatePicker
                              popover
                              compact
                              placeholder="Pick a date"
                              value={newTask.due_date ? newTask.due_date.slice(0, 10) : ""}
                              onChange={(v) =>
                                setNewTask((f) => ({ ...f, due_date: v }))
                              }
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end pt-1 border-t border-(--color-border)">
                          <Button
                            variant="secondary"
                            size="sm"
                            type="button"
                            onClick={() => {
                              setTaskOpen(false);
                              setNewTask({
                                title: "",
                                priority: "Medium",
                                due_date: "",
                              });
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            type="submit"
                            disabled={!newTask.title.trim()}
                          >
                            Create Task
                          </Button>
                        </div>
                      </form>
                    )}
                    <TaskList
                      tasks={tasks}
                      onToggle={handleTaskToggle}
                      onDelete={handleDeleteTask}
                    />
                  </div>
                )}

                {/* ── Timeline (system-generated, read-only) ── */}
                {activeTab === "timeline" && (
                  <Timeline
                    activities={activities}
                    emptyText="Activity will appear here automatically."
                  />
                )}
              </div>
            </Card>

            {/* ── Appointments ── */}
            <Card className="border-(--color-border) overflow-hidden">
              <div
                className="flex items-center justify-between px-5 py-3.5 border-b border-(--color-border)"
                style={{ background: "var(--color-surface-2)" }}
              >
                <div className="flex items-center gap-2">
                  <Calendar size={14} style={{ color: "var(--color-brand)" }} />
                  <p
                    className="text-xs font-700 uppercase tracking-widest"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Appointments
                  </p>
                </div>
                {!showBookForm && (
                  <Button size="sm" onClick={() => setShowBookForm(true)}>
                    <Plus size={14} /> Book Appointment
                  </Button>
                )}
              </div>

              <div
                className={clsx(
                  "p-3 space-y-3",
                  !showBookForm && "max-h-96 overflow-y-auto",
                )}
              >
                {showBookForm && (
                  <BookAppointmentForm
                    doctors={doctors}
                    saving={bookingSaving}
                    withPatient
                    defaultName={displayName}
                    defaultPhone={displayPhone || ""}
                    onCancel={() => setShowBookForm(false)}
                    onSubmit={handleBookAppointment}
                    note={!lead.patient_id && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                        style={{ background: "#fef9c3", color: "#92400e" }}>
                        <AlertCircle size={13} />
                        No patient record yet — one will be created automatically on booking.
                      </div>
                    )}
                  />
                )}

                {appointments.length === 0 && !showBookForm ? (
                  <div className="-mx-3 -mb-3 py-12 text-center border-t border-(--color-border)">
                    <Calendar size={28} className="mx-auto mb-2 opacity-30" />
                    <p
                      className="text-sm font-500"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      No appointments booked yet.
                    </p>
                  </div>
                ) : (
                  <div className="-mx-3 -mb-3 px-2 py-3 border-t border-(--color-border)">
                    <AppointmentList
                      appointments={appointments}
                      doctors={doctors}
                      onStatusChange={handleApptStatus}
                      onPaymentUpdate={handleApptPayment}
                      onReschedule={handleApptReschedule}
                    />
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* ── Full-width Follow-ups section ── */}
        <Card className="border-(--color-border) overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3 border-b border-(--color-border)"
            style={{ background: "var(--color-surface-2)" }}
          >
            <p
              className="text-xs font-700 uppercase tracking-widest"
              style={{ color: "var(--color-text-muted)" }}
            >
              Follow-ups
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={showFuForm ? "secondary" : "primary"}
                onClick={() => setShowFuForm((v) => !v)}
              >
                {showFuForm ? (
                  <><X size={14} /> Cancel</>
                ) : (
                  <><Plus size={14} /> Add Follow-up</>
                )}
              </Button>
            </div>
          </div>
          <div className="p-3 space-y-3">
            <div className="-mx-3 -mb-3 max-h-150 overflow-y-auto">
              <FollowupTable
                followups={followups}
                staff={org?.settings?.staff_members || []}
                onField={handleFollowupField}
                onCreate={handleCreateFollowupInline}
                onDelete={handleDeleteFollowup}
                statusStyle={Object.fromEntries(
                  stages.map((s) => [
                    s.name,
                    { bg: s.color + "22", color: s.color },
                  ]),
                )}
                typeStyle={TYPE_COLOR}
                types={FOLLOWUP_TYPES}
                outcomeOptions={(t) => FOLLOWUP_STATUS_OPTIONS[t] || []}
                statusOptions={stages.map((s) => s.name)}
                sort={fuSort}
                onSortToggle={() =>
                  setFuSort((s) =>
                    s === "scheduled_asc" ? "scheduled_desc" : "scheduled_asc",
                  )
                }
                addingRow={showFuForm}
                onAddingRowDone={() => setShowFuForm(false)}
              />
            </div>
          </div>
        </Card>

        {/* ── Notes (full-width, last section) ── */}
        <Card className="border-(--color-border) overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3 border-b border-(--color-border)"
            style={{ background: "var(--color-surface-2)" }}
          >
            <p
              className="text-xs font-700 uppercase tracking-widest"
              style={{ color: "var(--color-text-muted)" }}
            >
              Notes
            </p>
            {!notesEditing && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setNotesDraft(lead.description || "");
                  setNotesEditing(true);
                }}
              >
                <Edit2 size={13} /> {lead.description ? "Edit" : "Add note"}
              </Button>
            )}
          </div>
          <div className="p-4">
            {notesEditing ? (
              <div className="space-y-3">
                <Textarea
                  placeholder="Write a note about this lead…"
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  rows={5}
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => setNotesEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    onClick={handleSaveNotes}
                    disabled={notesSaving}
                  >
                    {notesSaving ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
            ) : lead.description ? (
              <p
                className="text-sm leading-relaxed whitespace-pre-line"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {lead.description}
              </p>
            ) : (
              <p
                className="text-xs"
                style={{ color: "var(--color-text-muted)" }}
              >
                No notes yet. Click “Add note” to write one.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
