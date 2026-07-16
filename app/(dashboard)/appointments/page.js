"use client";
import { useEffect, useRef, useState } from "react";
import {
  Plus,
  User,
  UserRound,
  Link2,
  Hash,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  CalendarClock,
  Banknote,
  CreditCard,
} from "lucide-react";
import { Button, Spinner } from "@/components/ui";
import CustomDatePicker from "@/components/crm/CustomDatePicker";
import { getAppointments, updateAppointment } from "@/lib/supabase/queries";
import { useOrg } from "@/lib/context/OrgContext";
import Link from "next/link";
import {
  format,
  isToday,
  isTomorrow,
  startOfWeek,
  isSameDay,
  addDays,
} from "date-fns";

const STATUS_STYLE = {
  confirmed: { bg: "#dcfce7", color: "#15803d", label: "Confirmed" },
  booked: { bg: "#dbeafe", color: "#1d4ed8", label: "Booked" },
  completed: { bg: "#f3f4f6", color: "#374151", label: "Completed" },
  cancelled: { bg: "#fee2e2", color: "#b91c1c", label: "Cancelled" },
};

// ── Appointment card ───────────────────────────────────────────
function ApptCard({
  appt,
  doctors = [],
  onStatusChange,
  onPaymentUpdate,
  onReschedule,
}) {
  const st = STATUS_STYLE[appt.status] || STATUS_STYLE.confirmed;
  const date = new Date(appt.scheduled_at);
  const [rescheduling, setRescheduling] = useState(false);
  const [rDate, setRDate] = useState(format(date, "yyyy-MM-dd"));
  const [rTime, setRTime] = useState(format(date, "HH:mm"));

  const openReschedule = () => {
    setRDate(format(date, "yyyy-MM-dd"));
    setRTime(format(date, "HH:mm"));
    setRescheduling(true);
  };
  const saveReschedule = () => {
    if (!rDate) return;
    const iso = new Date(`${rDate}T${rTime || "10:00"}:00`).toISOString();
    onReschedule?.(appt.id, iso);
    setRescheduling(false);
  };

  // Collecting a fee — confirm cash vs online before marking paid.
  const [collecting, setCollecting] = useState(null); // null | 'consult' | 'reg'
  const confirmCollect = (mode) => {
    const patch =
      collecting === "consult"
        ? { consultation_fee_status: "paid", payment_mode: mode }
        : { registration_fee_status: "paid", payment_mode: mode };
    onPaymentUpdate(appt.id, patch);
    setCollecting(null);
  };
  const patientName =
    [appt.patients?.first_name, appt.patients?.last_name]
      .filter(Boolean)
      .join(" ") || "Unknown Patient";
  const leadName = appt.leads
    ? [appt.leads.first_name, appt.leads.last_name].filter(Boolean).join(" ") ||
      appt.leads.title ||
      "Lead"
    : null;
  const doctor = appt.doctor_id
    ? doctors.find((d) => d.id === appt.doctor_id)
    : null;

  const getDateLabel = () => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEE, MMM d yyyy");
  };

  const canAct = appt.status === "confirmed" || appt.status === "booked";

  // Payment info
  const cFee =
    appt.consultation_fee != null ? Number(appt.consultation_fee) : null;
  const rFee =
    appt.registration_fee != null ? Number(appt.registration_fee) : null;
  const cPaid = appt.consultation_fee_status === "paid";
  const rPaid = appt.registration_fee_status === "paid";
  const dueAmt = (cFee && !cPaid ? cFee : 0) + (rFee && !rPaid ? rFee : 0);
  const hasFees = cFee != null || rFee != null;

  return (
    <div
      className="rounded-2xl border border-(--color-border) overflow-hidden transition-shadow hover:shadow-sm"
      style={{ background: "var(--color-surface)" }}
    >
      <div className="flex items-stretch">
        {/* Time column */}
        <div
          className="w-36 shrink-0 flex flex-col items-center justify-center gap-0.5 p-4 border-r border-(--color-border)"
          style={{ background: "var(--color-surface-2)" }}
        >
          <p
            className="text-[10px] font-700 uppercase tracking-widest"
            style={{ color: "var(--color-brand)" }}
          >
            {getDateLabel()}
          </p>
          <p
            className="text-2xl font-800 leading-none"
            style={{ color: "var(--color-text-primary)" }}
          >
            {format(date, "h:mm")}
          </p>
          <p
            className="text-xs font-600"
            style={{ color: "var(--color-text-muted)" }}
          >
            {format(date, "a · MMM d")}
          </p>

          {/* Due amount indicator in time column */}
          {hasFees && (
            <div className="mt-2 pt-2 border-t border-(--color-border) w-full text-center">
              {dueAmt > 0 ? (
                <p
                  className="text-[10px] font-700"
                  style={{ color: "#a16207" }}
                >
                  ₹{dueAmt.toLocaleString()} due
                </p>
              ) : (
                <p
                  className="text-[10px] font-700"
                  style={{ color: "#15803d" }}
                >
                  Fully paid
                </p>
              )}
            </div>
          )}
        </div>

        {/* Content column */}
        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {appt.patients?.id ? (
                  <Link
                    href={`/patients/${appt.patients.id}`}
                    className="text-sm font-700 hover:underline truncate"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {patientName}
                  </Link>
                ) : (
                  <span
                    className="text-sm font-700"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {patientName}
                  </span>
                )}
                <span
                  className="text-[10px] font-700 px-2 py-0.5 rounded-full shrink-0 capitalize"
                  style={{ background: st.bg, color: st.color }}
                >
                  {st.label}
                </span>
                {appt.appointment_code && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-700 px-2 py-0.5 rounded-full shrink-0 font-mono tracking-tight"
                    style={{
                      background: "var(--color-surface-2)",
                      color: "var(--color-text-secondary)",
                    }}
                    title="Appointment number"
                  >
                    <Hash size={9} />
                    {appt.appointment_code}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                <span
                  className="flex items-center gap-1 text-xs"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  <UserRound size={12} /> Patient
                </span>
                {doctor && (
                  <span
                    className="flex items-center gap-1 text-xs"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <User size={12} />
                    {doctor.name}
                    {doctor.department ? ` · ${doctor.department}` : ""}
                  </span>
                )}
                {leadName && appt.leads?.id && (
                  <Link
                    href={`/leads/${appt.leads.id}`}
                    className="flex items-center gap-1 text-xs font-500 transition-opacity hover:opacity-70"
                    style={{ color: "var(--color-brand)" }}
                  >
                    <Link2 size={11} /> {leadName}
                  </Link>
                )}
              </div>

              {appt.notes && (
                <p
                  className="mt-2 text-xs italic border-l-2 pl-3"
                  style={{
                    color: "var(--color-text-muted)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  "{appt.notes}"
                </p>
              )}

              {/* Payment badges */}
              {hasFees && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {cFee != null && (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-600 px-2 py-0.5 rounded-full"
                      style={
                        cPaid
                          ? { background: "#dcfce7", color: "#15803d" }
                          : { background: "#fef9c3", color: "#854d0e" }
                      }
                    >
                      <IndianRupee size={9} />
                      {cFee.toLocaleString()} consult · {cPaid ? "Paid" : "Due"}
                    </span>
                  )}
                  {rFee != null && (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-600 px-2 py-0.5 rounded-full"
                      style={
                        rPaid
                          ? { background: "#dcfce7", color: "#15803d" }
                          : { background: "#fef9c3", color: "#854d0e" }
                      }
                    >
                      <IndianRupee size={9} />
                      {rFee.toLocaleString()} reg · {rPaid ? "Paid" : "Due"}
                    </span>
                  )}
                  {appt.payment_mode && (cPaid || rPaid) && (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-500 px-2 py-0.5 rounded-full capitalize"
                      style={{
                        background: "var(--color-surface-2)",
                        color: "var(--color-text-muted)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      {appt.payment_mode}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            {canAct && (
              <div className="flex flex-col items-end gap-2 shrink-0">
                {collecting ? (
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <span
                      className="text-[11px] font-600"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      Collect{" "}
                      {collecting === "consult"
                        ? "consultation"
                        : "registration"}{" "}
                      fee via
                    </span>
                    <button
                      type="button"
                      onClick={() => confirmCollect("cash")}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border transition-colors hover:bg-green-50"
                      style={{
                        borderColor: "#86efac",
                        color: "#15803d",
                        background: "var(--color-surface)",
                      }}
                    >
                      <Banknote size={11} /> Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmCollect("online")}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border transition-colors hover:bg-blue-50"
                      style={{
                        borderColor: "#93c5fd",
                        color: "#1d4ed8",
                        background: "var(--color-surface)",
                      }}
                    >
                      <CreditCard size={11} /> Online
                    </button>
                    <button
                      type="button"
                      onClick={() => setCollecting(null)}
                      title="Cancel"
                      className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors hover:bg-(--color-surface-2)"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {/* Per-fee pay buttons — shown only when that fee is due */}
                    {cFee != null && !cPaid && (
                      <button
                        type="button"
                        onClick={() => setCollecting("consult")}
                        title="Collect consultation fee"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border transition-colors hover:bg-amber-50"
                        style={{
                          borderColor: "#fcd34d",
                          color: "#b45309",
                          background: "var(--color-surface)",
                        }}
                      >
                        <IndianRupee size={10} /> Collect consult
                      </button>
                    )}
                    {rFee != null && !rPaid && (
                      <button
                        type="button"
                        onClick={() => setCollecting("reg")}
                        title="Collect registration fee"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border transition-colors hover:bg-amber-50"
                        style={{
                          borderColor: "#fcd34d",
                          color: "#b45309",
                          background: "var(--color-surface)",
                        }}
                      >
                        <IndianRupee size={10} /> Collect reg
                      </button>
                    )}

                    {/* Reschedule */}
                    <button
                      type="button"
                      onClick={() =>
                        rescheduling ? setRescheduling(false) : openReschedule()
                      }
                      title="Reschedule appointment"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border transition-colors hover:bg-(--color-surface-2)"
                      style={
                        rescheduling
                          ? {
                              borderColor: "var(--color-brand)",
                              color: "var(--color-brand)",
                              background: "var(--color-brand-50)",
                            }
                          : {
                              borderColor: "var(--color-border)",
                              color: "var(--color-text-secondary)",
                              background: "var(--color-surface)",
                            }
                      }
                    >
                      <CalendarClock size={11} /> Reschedule
                    </button>

                    {/* Complete — blocked until all dues cleared */}
                    <button
                      type="button"
                      disabled={dueAmt > 0}
                      onClick={() =>
                        dueAmt === 0 && onStatusChange(appt.id, "completed")
                      }
                      title={
                        dueAmt > 0
                          ? "Clear all dues before completing"
                          : "Mark as completed"
                      }
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border transition-all"
                      style={
                        dueAmt > 0
                          ? {
                              background: "var(--color-surface-2)",
                              color: "var(--color-text-muted)",
                              borderColor: "transparent",
                              cursor: "not-allowed",
                              opacity: 0.6,
                            }
                          : {
                              background: "var(--color-brand)",
                              color: "#fff",
                              borderColor: "var(--color-brand)",
                            }
                      }
                    >
                      <Check size={11} /> Complete
                    </button>

                    {/* Cancel */}
                    <button
                      type="button"
                      onClick={() => onStatusChange(appt.id, "cancelled")}
                      title="Cancel appointment"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 border transition-colors hover:bg-red-50"
                      style={{
                        borderColor: "#fecaca",
                        color: "#b91c1c",
                        background: "var(--color-surface)",
                      }}
                    >
                      <X size={11} /> Cancel
                    </button>
                  </div>
                )}

                {/* Inline reschedule panel */}
                {rescheduling && (
                  <div
                    className="p-2.5 rounded-xl border space-y-3"
                    style={{
                      borderColor: "var(--color-border)",
                      background: "var(--color-surface-2)",
                    }}
                  >
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="flex flex-col gap-1 w-48">
                        <label
                          className="text-[10px] font-600 uppercase tracking-wide"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          Date
                        </label>
                        <CustomDatePicker
                          popover
                          value={rDate}
                          onChange={setRDate}
                          placeholder="Pick a date"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label
                          className="text-[10px] font-600 uppercase tracking-wide"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          Time
                        </label>
                        <input
                          type="time"
                          value={rTime}
                          onChange={(e) => setRTime(e.target.value)}
                          className="px-2 py-1.5 rounded-lg border text-[12px] outline-none focus:border-(--color-brand)"
                          style={{
                            borderColor: "var(--color-border)",
                            background: "var(--color-surface)",
                            color: "var(--color-text-primary)",
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setRescheduling(false)}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-600 transition-colors hover:bg-(--color-surface)"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveReschedule}
                        disabled={!rDate}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-600 transition-opacity hover:opacity-90"
                        style={{
                          background: "var(--color-brand)",
                          color: "#fff",
                          opacity: rDate ? 1 : 0.5,
                        }}
                      >
                        <Check size={11} /> Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Schedule (doctor timeline) view ────────────────────────────
const SCH_DUR = 45; // display slot length in minutes (appts store no duration)
const SCH_MIN_HOUR_W = 72; // minimum px per hour; grows to fill the panel width
const SCH_LANE_H = 48; // px per stacked lane within a doctor row
const SCH_DOC_W = 176; // px width of the left doctor column
const SCH_DAY_START = 9; // default first hour shown
const SCH_DAY_END = 21; // default last hour shown (9 PM)

// Greedy lane packing so overlapping appts for one doctor stack vertically.
function packLanes(appts, minsFn) {
  const sorted = [...appts].sort(
    (a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at),
  );
  const laneEnds = [];
  const placed = sorted.map((a) => {
    const start = minsFn(a);
    let lane = laneEnds.findIndex((e) => e <= start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(start + SCH_DUR);
    } else {
      laneEnds[lane] = start + SCH_DUR;
    }
    return { appt: a, lane, start };
  });
  return { placed, laneCount: Math.max(1, laneEnds.length) };
}

function DateStrip({ selected, onSelect }) {
  const [start, setStart] = useState(() =>
    startOfWeek(selected, { weekStartsOn: 1 }),
  );
  // Number of day boxes is derived from the available width so the strip
  // stays full without stretching individual boxes.
  const trackRef = useRef(null);
  const [count, setCount] = useState(14);
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const BOX = 48; // w-12
    const GAP = 6; // gap-1.5
    const measure = () =>
      setCount(Math.max(1, Math.floor((el.clientWidth + GAP) / (BOX + GAP))));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const days = Array.from({ length: count }, (_, i) => addDays(start, i));
  return (
    <div className="flex items-center gap-2 px-3 py-3 border-b border-(--color-border) shrink-0">
      <button
        type="button"
        onClick={() => setStart(addDays(start, -count))}
        className="p-1.5 rounded-lg shrink-0 transition-colors hover:bg-(--color-surface-2)"
        style={{ color: "var(--color-text-secondary)" }}
      >
        <ChevronLeft size={16} />
      </button>
      <div
        ref={trackRef}
        className="flex gap-1.5 flex-1 min-w-0 justify-between overflow-hidden"
      >
        {days.map((d, i) => {
          const sel = isSameDay(d, selected);
          const today = isToday(d);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(d)}
              className="flex flex-col items-center justify-center gap-0.5 shrink-0 w-12 py-1.5 rounded-xl border transition-all"
              style={
                sel
                  ? {
                      background: "var(--color-brand)",
                      borderColor: "var(--color-brand)",
                      color: "#fff",
                    }
                  : {
                      background: "var(--color-surface)",
                      borderColor: today
                        ? "var(--color-brand)"
                        : "var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }
              }
            >
              <span
                className="text-[10px] font-700 uppercase"
                style={sel ? undefined : { color: "var(--color-text-muted)" }}
              >
                {format(d, "EEE")}
              </span>
              <span className="text-base font-800 leading-none">
                {format(d, "d")}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => setStart(addDays(start, count))}
        className="p-1.5 rounded-lg shrink-0 transition-colors hover:bg-(--color-surface-2)"
        style={{ color: "var(--color-text-secondary)" }}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function ScheduleView({
  appointments,
  doctors,
  onStatusChange,
  onPaymentUpdate,
  onReschedule,
}) {
  const [selected, setSelected] = useState(new Date());
  const [activeId, setActiveId] = useState(null);

  // Measure the scroll area so the time axis can fill the panel width.
  const gridRef = useRef(null);
  const [gridW, setGridW] = useState(0);
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => setGridW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Drag-to-pan the timeline (no visible scrollbar).
  const dragMoved = useRef(false);
  const startDrag = (e) => {
    const el = gridRef.current;
    if (!el || e.button !== 0) return;
    const sx = e.clientX;
    const sy = e.clientY;
    const sl = el.scrollLeft;
    const st = el.scrollTop;
    dragMoved.current = false;
    const move = (ev) => {
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved.current = true;
      el.scrollLeft = sl - dx;
      el.scrollTop = st - dy;
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    document.body.style.userSelect = "none";
  };
  // If the press turned into a drag, swallow the click so blocks don't open.
  const onGridClickCapture = (e) => {
    if (dragMoved.current) {
      e.preventDefault();
      e.stopPropagation();
      dragMoved.current = false;
    }
  };

  const dayAppts = appointments.filter((a) =>
    isSameDay(new Date(a.scheduled_at), selected),
  );

  const mins = (a) => {
    const d = new Date(a.scheduled_at);
    return d.getHours() * 60 + d.getMinutes();
  };

  // Time range: defaults, expanded to fit any out-of-hours appointments.
  let startH = SCH_DAY_START;
  let endH = SCH_DAY_END;
  if (dayAppts.length) {
    startH = Math.min(startH, Math.floor(Math.min(...dayAppts.map(mins)) / 60));
    endH = Math.max(
      endH,
      Math.ceil((Math.max(...dayAppts.map(mins)) + SCH_DUR) / 60),
    );
  }
  startH = Math.max(0, startH);
  endH = Math.min(24, endH);
  const hours = [];
  for (let h = startH; h <= endH; h++) hours.push(h);
  // Stretch each hour to fill the available width; scroll only if it would fall
  // below the minimum hour width.
  const spanH = Math.max(1, endH - startH);
  const avail = gridW ? gridW - SCH_DOC_W : 0;
  const hourW = avail > 0 ? Math.max(SCH_MIN_HOUR_W, avail / spanH) : SCH_MIN_HOUR_W;
  const timelineW = spanH * hourW;

  const rows = doctors.map((doc) => ({
    id: doc.id || doc.name,
    doc,
    appts: dayAppts.filter((a) => a.doctor_id === doc.id),
  }));
  const unassigned = dayAppts.filter(
    (a) => !a.doctor_id || !doctors.some((d) => d.id === a.doctor_id),
  );
  if (unassigned.length)
    rows.push({ id: "__unassigned", doc: null, appts: unassigned });

  const activeAppt = activeId
    ? dayAppts.find((a) => a.id === activeId)
    : null;

  return (
    <div className="bg-white overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-border) shrink-0">
        <div>
          <p
            className="text-sm font-700"
            style={{ color: "var(--color-text-primary)" }}
          >
            {format(selected, "EEEE, MMMM d, yyyy")}
          </p>
          <p
            className="text-xs mt-0.5"
            style={{ color: "var(--color-text-muted)" }}
          >
            {dayAppts.length} appointment{dayAppts.length !== 1 ? "s" : ""} ·{" "}
            {doctors.length} doctor{doctors.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isToday(selected) && (
            <button
              type="button"
              onClick={() => setSelected(new Date())}
              className="text-xs font-600 px-2.5 py-1.5 rounded-lg border border-(--color-border) transition-colors hover:bg-(--color-surface-2)"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Today
            </button>
          )}
          <Link href="/appointments/new">
            <Button>
              <Plus size={16} /> Book Appointment
            </Button>
          </Link>
        </div>
      </div>

      <DateStrip selected={selected} onSelect={setSelected} />

      {/* Timeline grid */}
      <div
        ref={gridRef}
        onMouseDown={startDrag}
        onClickCapture={onGridClickCapture}
        className="overflow-auto flex-1 min-h-0 scrollbar-none select-none cursor-grab active:cursor-grabbing"
      >
        <div style={{ minWidth: SCH_DOC_W + timelineW }}>
          {/* Time header */}
          <div className="flex sticky top-0 z-30">
            <div
              className="sticky left-0 z-40 shrink-0 border-b border-r border-(--color-border)"
              style={{ width: SCH_DOC_W, background: "var(--color-surface-2)" }}
            >
              <span
                className="flex items-center h-full px-3 text-[10px] font-700 uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Doctors
              </span>
            </div>
            <div
              className="relative border-b border-(--color-border)"
              style={{
                width: timelineW,
                height: 34,
                background: "var(--color-surface-2)",
              }}
            >
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute top-0 h-full flex items-center"
                  style={{ left: (h - startH) * hourW }}
                >
                  <span
                    className="text-[10px] font-600 px-1"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {format(new Date(2000, 0, 1, h), "h a")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Doctor rows */}
          {rows.map((row) => {
            const { placed, laneCount } = packLanes(row.appts, mins);
            const rowH = laneCount * SCH_LANE_H + 8;
            const docName = row.doc ? row.doc.name : "Unassigned";
            const av = row.doc
              ? docName
                  .trim()
                  .split(/\s+/)
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()
              : "?";
            return (
              <div key={row.id} className="flex border-b border-(--color-border)">
                <div
                  className="sticky left-0 z-20 shrink-0 flex items-center gap-2 px-3 border-r border-(--color-border)"
                  style={{
                    width: SCH_DOC_W,
                    minHeight: rowH,
                    background: "var(--color-surface)",
                  }}
                >
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-700 text-white"
                    style={{
                      background: row.doc
                        ? "var(--color-brand)"
                        : "var(--color-text-muted)",
                    }}
                  >
                    {av}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-xs font-700 truncate"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {docName}
                    </p>
                    {row.doc?.department && (
                      <p
                        className="text-[10px] truncate"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {row.doc.department}
                      </p>
                    )}
                  </div>
                  {row.appts.length > 0 && (
                    <span
                      className="text-[10px] font-700 px-1.5 rounded-full shrink-0"
                      style={{
                        background: "var(--color-surface-2)",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {row.appts.length}
                    </span>
                  )}
                </div>
                <div className="relative" style={{ width: timelineW, height: rowH }}>
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="absolute top-0 bottom-0 border-r border-(--color-border)"
                      style={{ left: (h - startH) * hourW, opacity: 0.4 }}
                    />
                  ))}
                  {placed.map(({ appt, lane, start }) => {
                    const st =
                      STATUS_STYLE[appt.status] || STATUS_STYLE.confirmed;
                    const left = ((start - startH * 60) / 60) * hourW;
                    const width = (SCH_DUR / 60) * hourW;
                    const name =
                      [appt.patients?.first_name, appt.patients?.last_name]
                        .filter(Boolean)
                        .join(" ") || "Patient";
                    return (
                      <button
                        key={appt.id}
                        type="button"
                        onClick={() => setActiveId(appt.id)}
                        title={`${format(new Date(appt.scheduled_at), "h:mm a")} · ${name}`}
                        className="absolute rounded-lg px-2 py-1 text-left overflow-hidden transition-shadow hover:shadow-md"
                        style={{
                          left: left + 2,
                          width: width - 4,
                          top: lane * SCH_LANE_H + 4,
                          height: SCH_LANE_H - 8,
                          background: st.bg,
                          borderLeft: `3px solid ${st.color}`,
                        }}
                      >
                        <span
                          className="block text-[10px] font-700 leading-tight"
                          style={{ color: st.color }}
                        >
                          {format(new Date(appt.scheduled_at), "h:mm a")}
                        </span>
                        <span
                          className="block text-[11px] font-600 truncate"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {rows.length === 0 && (
            <div className="py-16 text-center">
              <p
                className="text-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
                No doctors configured. Add doctors in Settings.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Appointment detail modal */}
      {activeAppt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setActiveId(null)}
        >
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.4)" }}
          />
          <div
            className="relative w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveId(null)}
              className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center border border-(--color-border) shadow-md"
              style={{
                background: "var(--color-surface)",
                color: "var(--color-text-secondary)",
              }}
            >
              <X size={16} />
            </button>
            <ApptCard
              appt={activeAppt}
              doctors={doctors}
              onStatusChange={onStatusChange}
              onPaymentUpdate={onPaymentUpdate}
              onReschedule={onReschedule}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function AppointmentsPage() {
  const { orgId, org } = useOrg();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const doctors = org?.settings?.doctors || [];

  useEffect(() => {
    if (!orgId) return;
    let active = true;
    setLoading(true);
    getAppointments({ orgId })
      .then((data) => {
        if (active) setAppointments(data || []);
      })
      .catch(() => {
        if (active) setAppointments([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [orgId]);

  const handleStatusChange = async (id, status) => {
    try {
      const updated = await updateAppointment(id, { status });
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: updated.status } : a)),
      );
    } catch (e) {
      alert(e.message);
    }
  };

  const handlePaymentUpdate = async (id, patch) => {
    try {
      const updated = await updateAppointment(id, patch);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updated } : a)),
      );
    } catch (e) {
      alert(e.message);
    }
  };

  // Reschedule: changing the date re-generates appointment_code, so
  // merge the full returned row to reflect the new number immediately.
  const handleReschedule = async (id, scheduledAtIso) => {
    try {
      const updated = await updateAppointment(id, {
        scheduled_at: scheduledAtIso,
      });
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updated } : a)),
      );
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div
      className="flex flex-col"
      style={{ background: "#ffffff", height: "calc(100vh - 92px)" }}
    >
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size={28} />
        </div>
      ) : (
        <ScheduleView
          appointments={appointments}
          doctors={doctors}
          onStatusChange={handleStatusChange}
          onPaymentUpdate={handlePaymentUpdate}
          onReschedule={handleReschedule}
        />
      )}
    </div>
  );
}
