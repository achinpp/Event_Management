"use client";

import React, { useState, useEffect, useRef } from "react";

interface InteractiveEventDatePickerProps {
  name?: string;
  defaultValue?: string | null;
  value?: string | null;
  onChange?: (dateString: string | null) => void;
  required?: boolean;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const TIME_PRESETS = [
  { label: "Morning Kickoff", time: "09:00", hour: 9, minute: 0, period: "AM", icon: "🌅" },
  { label: "Midday Session", time: "12:00", hour: 12, minute: 0, period: "PM", icon: "☀️" },
  { label: "Afternoon Summit", time: "14:30", hour: 2, minute: 30, period: "PM", icon: "🌤️" },
  { label: "Evening Gala", time: "18:00", hour: 6, minute: 0, period: "PM", icon: "🌆" },
  { label: "Night Social", time: "20:00", hour: 8, minute: 0, period: "PM", icon: "🌙" },
];

export function InteractiveEventDatePicker({
  name = "starts_at",
  defaultValue,
  value: controlledValue,
  onChange,
  required = false,
}: InteractiveEventDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Internal selected date state
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    const initial = controlledValue !== undefined ? controlledValue : defaultValue;
    if (initial) {
      const d = new Date(initial);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  });

  // Current calendar view (month and year)
  const today = new Date();
  const [viewYear, setViewYear] = useState<number>(() => selectedDate ? selectedDate.getFullYear() : today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => selectedDate ? selectedDate.getMonth() : today.getMonth());

  // Time state
  const [selectedHour, setSelectedHour] = useState<number>(() => {
    if (!selectedDate) return 9;
    const h = selectedDate.getHours();
    return h === 0 ? 12 : h > 12 ? h - 12 : h;
  });
  const [selectedMinute, setSelectedMinute] = useState<number>(() => selectedDate ? selectedDate.getMinutes() : 0);
  const [selectedPeriod, setSelectedPeriod] = useState<"AM" | "PM">(() => {
    if (!selectedDate) return "AM";
    return selectedDate.getHours() >= 12 ? "PM" : "AM";
  });

  // Sync with controlled value if passed (React recommended render-time adjustment)
  const [prevControlledValue, setPrevControlledValue] = useState(controlledValue);
  if (controlledValue !== undefined && controlledValue !== prevControlledValue) {
    setPrevControlledValue(controlledValue);
    if (controlledValue) {
      const d = new Date(controlledValue);
      if (!isNaN(d.getTime())) {
        setSelectedDate(d);
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
        const h = d.getHours();
        setSelectedHour(h === 0 ? 12 : h > 12 ? h - 12 : h);
        setSelectedMinute(d.getMinutes());
        setSelectedPeriod(h >= 12 ? "PM" : "AM");
      }
    } else {
      setSelectedDate(null);
    }
  }

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Helper to format ISO local datetime string (YYYY-MM-DDTHH:mm)
  const formatInputValue = (date: Date | null): string => {
    if (!date) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Helper to construct updated date from year, month, day, hour, minute, period
  const buildDate = (year: number, month: number, day: number, hour12: number, minute: number, period: "AM" | "PM"): Date => {
    let hour24 = hour12 % 12;
    if (period === "PM") hour24 += 12;
    return new Date(year, month, day, hour24, minute, 0, 0);
  };

  const handleSelectDay = (day: number, monthOffset = 0) => {
    let targetMonth = viewMonth + monthOffset;
    let targetYear = viewYear;
    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear -= 1;
    } else if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }

    const newDate = buildDate(targetYear, targetMonth, day, selectedHour, selectedMinute, selectedPeriod);
    setSelectedDate(newDate);
    setViewMonth(targetMonth);
    setViewYear(targetYear);

    const valStr = formatInputValue(newDate);
    onChange?.(valStr);
  };

  const handleTimeChange = (newHour: number, newMin: number, newPeriod: "AM" | "PM") => {
    setSelectedHour(newHour);
    setSelectedMinute(newMin);
    setSelectedPeriod(newPeriod);

    if (selectedDate) {
      const updated = buildDate(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        newHour,
        newMin,
        newPeriod
      );
      setSelectedDate(updated);
      onChange?.(formatInputValue(updated));
    }
  };

  const applyPreset = (presetOffsetDays: number, hour = 9, minute = 0, period: "AM" | "PM" = "AM") => {
    const target = new Date();
    target.setDate(target.getDate() + presetOffsetDays);
    setSelectedHour(hour);
    setSelectedMinute(minute);
    setSelectedPeriod(period);
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());

    const newDate = buildDate(target.getFullYear(), target.getMonth(), target.getDate(), hour, minute, period);
    setSelectedDate(newDate);
    onChange?.(formatInputValue(newDate));
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDate(null);
    onChange?.(null);
  };

  // Calendar calculations
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const prevMonthDays = Array.from({ length: firstDayOfMonth }, (_, i) => daysInPrevMonth - firstDayOfMonth + i + 1);
  const currentMonthDays = Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1);
  const totalSlots = Math.ceil((firstDayOfMonth + daysInCurrentMonth) / 7) * 7;
  const nextMonthDays = Array.from({ length: totalSlots - (firstDayOfMonth + daysInCurrentMonth) }, (_, i) => i + 1);

  // Relative label calculation
  const getRelativeBadge = (date: Date) => {
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((startOfTarget.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { text: "Today", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
    if (diffDays === 1) return { text: "Tomorrow", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" };
    if (diffDays > 1 && diffDays < 7) return { text: `In ${diffDays} days`, color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" };
    if (diffDays >= 7) return { text: `In ${diffDays} days (${Math.round(diffDays / 7)}w)`, color: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" };
    return { text: `${Math.abs(diffDays)}d ago`, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
  };

  const formattedDisplay = selectedDate ? (
    <div className="flex items-center gap-1.5 text-left min-w-0 flex-1 overflow-hidden">
      <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate text-xs sm:text-sm">
        {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </span>
      <span className="text-zinc-400 dark:text-zinc-500 shrink-0">•</span>
      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 font-mono shrink-0 whitespace-nowrap">
        {selectedDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
      </span>
    </div>
  ) : null;

  return (
    <div className="relative w-full min-w-0">
      {/* Hidden input storing the value for standard form submission */}
      <input
        type="hidden"
        name={name}
        value={formatInputValue(selectedDate)}
        required={required}
      />

      {/* Interactive Trigger Button */}
      <div className="group relative w-full min-w-0">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex w-full max-w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm transition-all duration-200 focus:outline-none min-w-0 overflow-hidden ${
            isOpen
              ? "border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-500/20 dark:border-indigo-400 dark:bg-indigo-950/30"
              : "border-zinc-200/90 bg-white/70 hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-zinc-700"
          }`}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
              selectedDate
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            }`}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>

            {selectedDate ? (
              formattedDisplay
            ) : (
              <span className="text-zinc-400 dark:text-zinc-500 text-xs sm:text-sm truncate">
                Select date & time...
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {selectedDate && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => e.key === "Enter" && handleClear(e as unknown as React.MouseEvent)}
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                title="Clear date"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
            )}

            <svg
              className={`h-4 w-4 text-zinc-400 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180 text-indigo-600 dark:text-indigo-400" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </button>
      </div>

      {/* Popover Dropdown Overlay */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute left-0 top-full z-50 mt-2 w-full min-w-[340px] max-w-[420px] rounded-2xl border border-zinc-200/90 bg-white/95 p-4 shadow-2xl backdrop-blur-xl transition-all animate-in fade-in zoom-in-95 dark:border-zinc-800 dark:bg-zinc-900/95 sm:w-[380px]"
          role="dialog"
          aria-modal="true"
          aria-label="Event Date & Time Picker"
        >
          {/* Header Quick Presets */}
          <div className="mb-3.5">
            <div className="flex items-center justify-between pb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                ⚡ Quick Presets
              </span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                One-Click Setup
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  // Upcoming Saturday
                  const d = new Date();
                  const day = d.getDay();
                  const diff = (6 - day + 7) % 7 || 7;
                  applyPreset(diff, 9, 0, "AM");
                }}
                className="rounded-lg border border-zinc-200/70 bg-zinc-50/80 px-2 py-1 text-[11px] font-medium text-zinc-700 hover:border-indigo-400 hover:bg-indigo-50/70 hover:text-indigo-700 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300 transition-all"
              >
                🎉 This Weekend
              </button>
              <button
                type="button"
                onClick={() => applyPreset(7, 9, 0, "AM")}
                className="rounded-lg border border-zinc-200/70 bg-zinc-50/80 px-2 py-1 text-[11px] font-medium text-zinc-700 hover:border-indigo-400 hover:bg-indigo-50/70 hover:text-indigo-700 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300 transition-all"
              >
                📅 In 1 Week
              </button>
              <button
                type="button"
                onClick={() => applyPreset(14, 10, 0, "AM")}
                className="rounded-lg border border-zinc-200/70 bg-zinc-50/80 px-2 py-1 text-[11px] font-medium text-zinc-700 hover:border-indigo-400 hover:bg-indigo-50/70 hover:text-indigo-700 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300 transition-all"
              >
                🚀 In 2 Weeks
              </button>
              <button
                type="button"
                onClick={() => applyPreset(30, 9, 0, "AM")}
                className="rounded-lg border border-zinc-200/70 bg-zinc-50/80 px-2 py-1 text-[11px] font-medium text-zinc-700 hover:border-indigo-400 hover:bg-indigo-50/70 hover:text-indigo-700 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300 transition-all"
              >
                🗓️ In 1 Month
              </button>
            </div>
          </div>

          <div className="h-px w-full bg-zinc-100 dark:bg-zinc-800/80 mb-3" />

          {/* Month Navigation & Year Selector */}
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value))}
                className="rounded-lg border border-zinc-200/80 bg-zinc-50 px-2 py-1 text-xs font-bold text-zinc-800 transition-colors focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value))}
                className="rounded-lg border border-zinc-200/80 bg-zinc-50 px-2 py-1 text-xs font-bold text-zinc-800 transition-colors focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
              >
                {Array.from({ length: 6 }, (_, i) => today.getFullYear() - 1 + i).map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (viewMonth === 0) {
                    setViewMonth(11);
                    setViewYear((y) => y - 1);
                  } else {
                    setViewMonth((m) => m - 1);
                  }
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200/70 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
                title="Previous Month"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (viewMonth === 11) {
                    setViewMonth(0);
                    setViewYear((y) => y + 1);
                  } else {
                    setViewMonth((m) => m + 1);
                  }
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200/70 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
                title="Next Month"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="mb-3.5">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mb-1">
              {DAYS_OF_WEEK.map((d, i) => (
                <div key={d} className={`py-1 ${i === 0 || i === 6 ? "text-indigo-400 dark:text-indigo-400/80" : ""}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Day Cells */}
            <div className="grid grid-cols-7 gap-1">
              {/* Previous Month Overflow */}
              {prevMonthDays.map((d) => (
                <button
                  key={`prev-${d}`}
                  type="button"
                  onClick={() => handleSelectDay(d, -1)}
                  className="flex h-8 w-full items-center justify-center rounded-lg text-xs text-zinc-300 hover:bg-zinc-100 dark:text-zinc-700 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  {d}
                </button>
              ))}

              {/* Current Month Days */}
              {currentMonthDays.map((d) => {
                const isSelected =
                  selectedDate &&
                  selectedDate.getDate() === d &&
                  selectedDate.getMonth() === viewMonth &&
                  selectedDate.getFullYear() === viewYear;

                const isToday =
                  today.getDate() === d &&
                  today.getMonth() === viewMonth &&
                  today.getFullYear() === viewYear;

                return (
                  <button
                    key={`curr-${d}`}
                    type="button"
                    onClick={() => handleSelectDay(d, 0)}
                    className={`relative flex h-8 w-full items-center justify-center rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-gradient-to-tr from-indigo-600 to-violet-600 font-bold text-white shadow-md shadow-indigo-500/30 scale-105 z-10"
                        : isToday
                        ? "border border-indigo-500/50 bg-indigo-500/10 font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20"
                        : "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {d}
                    {isToday && !isSelected && (
                      <span className="absolute bottom-1 h-1 w-1 rounded-full bg-indigo-500" />
                    )}
                  </button>
                );
              })}

              {/* Next Month Overflow */}
              {nextMonthDays.map((d) => (
                <button
                  key={`next-${d}`}
                  type="button"
                  onClick={() => handleSelectDay(d, 1)}
                  className="flex h-8 w-full items-center justify-center rounded-lg text-xs text-zinc-300 hover:bg-zinc-100 dark:text-zinc-700 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px w-full bg-zinc-100 dark:bg-zinc-800/80 mb-3" />

          {/* Time & Session Selector */}
          <div className="mb-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                ⏰ Starting Time
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                {selectedHour.toString().padStart(2, "0")}:{selectedMinute.toString().padStart(2, "0")} {selectedPeriod}
              </span>
            </div>

            {/* Custom Hour / Minute / AM-PM Picker */}
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-1.5 rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-1.5 dark:border-zinc-800 dark:bg-zinc-950/60">
                <span className="text-[10px] font-bold text-zinc-400 pl-1">Hr</span>
                <select
                  value={selectedHour}
                  onChange={(e) => handleTimeChange(parseInt(e.target.value), selectedMinute, selectedPeriod)}
                  className="flex-1 bg-transparent text-xs font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none cursor-pointer"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={h}>
                      {h.toString().padStart(2, "0")}
                    </option>
                  ))}
                </select>

                <span className="text-zinc-400 font-bold">:</span>

                <span className="text-[10px] font-bold text-zinc-400">Min</span>
                <select
                  value={selectedMinute}
                  onChange={(e) => handleTimeChange(selectedHour, parseInt(e.target.value), selectedPeriod)}
                  className="flex-1 bg-transparent text-xs font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none cursor-pointer"
                >
                  {[0, 15, 30, 45].map((m) => (
                    <option key={m} value={m}>
                      {m.toString().padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>

              {/* AM / PM Toggle */}
              <div className="flex rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-1 dark:border-zinc-800 dark:bg-zinc-950/60">
                <button
                  type="button"
                  onClick={() => handleTimeChange(selectedHour, selectedMinute, "AM")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    selectedPeriod === "AM"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => handleTimeChange(selectedHour, selectedMinute, "PM")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    selectedPeriod === "PM"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  PM
                </button>
              </div>
            </div>

            {/* Popular Time Slots */}
            <div className="flex flex-wrap gap-1">
              {TIME_PRESETS.map((preset) => {
                const isActive =
                  selectedHour === preset.hour &&
                  selectedMinute === preset.minute &&
                  selectedPeriod === preset.period;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleTimeChange(preset.hour, preset.minute, preset.period as "AM" | "PM")}
                    className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium transition-all ${
                      isActive
                        ? "bg-indigo-600 text-white font-semibold shadow-xs"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                    }`}
                  >
                    <span>{preset.icon}</span>
                    <span>{preset.time} {preset.period}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI / Campaign Context Banner */}
          {selectedDate && (
            <div className="mb-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-2.5 text-[11px] text-zinc-600 dark:text-zinc-300">
              <div className="flex items-start gap-1.5">
                <span className="text-indigo-500">✨</span>
                <p className="leading-tight">
                  Scheduled for <strong className="text-indigo-600 dark:text-indigo-400">{selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</strong> at <strong className="text-indigo-600 dark:text-indigo-400">{selectedDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</strong>. AI campaign timelines and guest reminders will anchor to this date.
                </p>
              </div>
            </div>
          )}

          {/* Action footer */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setSelectedDate(now);
                setViewYear(now.getFullYear());
                setViewMonth(now.getMonth());
                const h = now.getHours();
                const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
                const min = Math.round(now.getMinutes() / 15) * 15 % 60;
                const p = h >= 12 ? "PM" : "AM";
                setSelectedHour(hr);
                setSelectedMinute(min);
                setSelectedPeriod(p);
                const updated = buildDate(now.getFullYear(), now.getMonth(), now.getDate(), hr, min, p);
                setSelectedDate(updated);
                onChange?.(formatInputValue(updated));
              }}
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
            >
              Set to Now
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 active:scale-95 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
