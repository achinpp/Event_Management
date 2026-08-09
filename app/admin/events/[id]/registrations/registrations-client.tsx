"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import useSWR from "swr";
import * as XLSX from "xlsx";

interface EventDetail {
  event: {
    id: string;
    title: string;
    description: string | null;
    starts_at: string | null;
    venue: string | null;
    status: string;
    invite_lead_days?: number;
  };
  registrations: Array<{
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    rsvp_status: string;
    rsvp_at: string | null;
    chat_token: string;
    created_at: string;
  }>;
}

interface UploadLog {
  recipient: string;
  phone: string;
  message: string;
  status: string;
}

interface UploadResult {
  success: boolean;
  added: number;
  skipped: number;
  logs: UploadLog[];
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (res.status === 401 || data?.error === "Unauthorized") {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }
  return data;
};

const RSVP_STYLES: Record<string, string> = {
  confirmed: "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20",
  declined: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20",
  pending: "bg-zinc-500/10 text-zinc-650 dark:text-zinc-400 border border-zinc-500/20 opacity-80",
};

export default function RegistrationsClient({ eventId }: { eventId: string }) {
  const { data, error, isLoading, mutate } = useSWR<EventDetail>(
    `/api/events/${eventId}`,
    fetcher,
    {
      refreshInterval: 2000,
    }
  );

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Upload states
  const [dragActive, setDragActive] = useState(false);
  const [parsedGuests, setParsedGuests] = useState<Array<{ full_name: string; email: string; phone: string }>>([]);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-100 flex items-center justify-center">
        <p className="text-sm opacity-70 animate-pulse">Loading registrations…</p>
      </div>
    );
  }

  if (error || !data || !data.event) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-sm text-red-500 font-semibold">Failed to load registration data.</p>
        <Link href="/admin" className="mt-4 text-xs font-semibold text-indigo-500 hover:underline">
          Go back to Admin Home
        </Link>
      </div>
    );
  }

  const { event, registrations } = data;

  // Statistics calculation
  const totalCount = registrations.length;
  const confirmedCount = registrations.filter((r) => r.rsvp_status === "confirmed").length;
  const declinedCount = registrations.filter((r) => r.rsvp_status === "declined").length;
  const pendingCount = registrations.filter((r) => r.rsvp_status === "pending").length;

  // Filtered registrations
  const filteredRegs = registrations.filter((reg) => {
    const term = search.toLowerCase();
    return (
      (reg.full_name ?? "").toLowerCase().includes(term) ||
      (reg.email ?? "").toLowerCase().includes(term)
    );
  });

  async function copyLink(reg: typeof registrations[number]) {
    await navigator.clipboard.writeText(
      `${window.location.origin}/chat/${reg.chat_token}`
    );
    setCopiedId(reg.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  // --- CSV/Excel Upload Handlers ---

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const normalizePhoneNumber = (phoneStr: string): string => {
    let cleaned = phoneStr.replace(/\s+/g, "").replace(/[-()]/g, "");
    
    // Normalize local Sri Lankan numbers to international E.164 (e.g. 0771234567 -> +94771234567)
    if (cleaned.startsWith("07")) {
      cleaned = "+94" + cleaned.slice(1);
    } else if (cleaned.startsWith("7") && cleaned.length === 9) {
      cleaned = "+94" + cleaned;
    } else if (cleaned.startsWith("94") && !cleaned.startsWith("+")) {
      cleaned = "+" + cleaned;
    }
    
    return cleaned;
  };

  const handleFile = (file: File) => {
    setUploadError(null);
    setUploadResult(null);

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv" && ext !== "xlsx" && ext !== "xls") {
      setUploadError("Invalid file format. Please upload a CSV or Excel file (.csv, .xlsx, .xls).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const dataArr = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(dataArr, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });
        
        if (json.length === 0) {
          setUploadError("The uploaded file does not contain any rows.");
          return;
        }

        // Standardize keys (looking for variations of Name, Email, Phone/WhatsApp)
        const parsed = json.map((row) => {
          const rowKeys = Object.keys(row);
          let full_name = "";
          let email = "";
          let phone = "";

          for (const key of rowKeys) {
            const keyLower = key.toLowerCase().trim();
            const val = String(row[key] ?? "").trim();

            if (
              keyLower.includes("name") ||
              keyLower === "fullname" ||
              keyLower === "attendee" ||
              keyLower === "candidate" ||
              keyLower === "guest"
            ) {
              full_name = val;
            } else if (
              keyLower.includes("email") ||
              keyLower === "mail" ||
              keyLower === "emailaddress" ||
              keyLower === "email address"
            ) {
              email = val;
            } else if (
              keyLower.includes("phone") ||
              keyLower.includes("whatsapp") ||
              keyLower.includes("mobile") ||
              keyLower === "number" ||
              keyLower === "contact" ||
              keyLower === "contactno"
            ) {
              phone = normalizePhoneNumber(val);
            }
          }

          return { full_name, email, phone };
        });

        // Filter out records that don't have a name and contact detail
        const validGuests = parsed.filter(
          (g) => g.full_name.trim() !== "" && (g.email.trim() !== "" || g.phone.trim() !== "")
        );

        if (validGuests.length === 0) {
          setUploadError("Could not find valid attendee data. Ensure headers are named 'Name', 'Email', and 'Phone/WhatsApp'.");
          return;
        }

        setParsedGuests(validGuests);
        setFileName(file.name);
      } catch (err: any) {
        setUploadError(`Failed to parse file: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const uploadGuests = async () => {
    if (parsedGuests.length === 0) return;
    setUploading(true);
    setUploadError(null);

    try {
      const res = await fetch(`/api/events/${eventId}/registrations/upload`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guests: parsedGuests }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error ?? "Failed to upload guests.");
      }

      setUploadResult(result);
      setParsedGuests([]);
      setFileName("");
      
      // Refresh SWR list
      mutate();
    } catch (err: any) {
      setUploadError(err.message || "Failed to process upload.");
    } finally {
      setUploading(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-100">
      
      {/* Navigation Header */}
      <header className="sticky top-0 z-45 w-full border-b border-zinc-200/50 bg-white/85 backdrop-blur-md dark:border-zinc-800/50 dark:bg-zinc-950/85">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/admin" className="flex items-center gap-2 font-sans text-xl font-bold tracking-tight">
            <svg
              className="h-6 w-6 text-indigo-600 dark:text-indigo-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
            <span className="bg-gradient-to-r from-zinc-900 to-zinc-600 bg-clip-text text-transparent dark:from-zinc-100 dark:to-zinc-400">
              EventPilot Console
            </span>
          </Link>
          <nav className="flex gap-4">
            <Link
              href="/"
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              View Landing Page
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-7xl px-6 py-10">
        
        {/* Glow Blobs */}
        <div className="absolute top-20 left-10 -z-10 h-[300px] w-[300px] rounded-full bg-indigo-500/5 blur-[120px] dark:bg-indigo-500/10" />
        <div className="absolute bottom-20 right-10 -z-10 h-[250px] w-[250px] rounded-full bg-cyan-500/5 blur-[100px] dark:bg-cyan-500/10" />

        {/* Back Link */}
        <Link
          href={`/admin/events/${eventId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 transition-colors hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-200 mb-6"
        >
          <span>←</span> Back to Event Console
        </Link>

        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Attendee Registrations
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              Upload a guest list spreadsheet, validate formats, and trigger real-time AI WhatsApp confirmation outreach.
            </p>
          </div>
          <span className="text-[10px] self-start md:self-center font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-550/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10">
            🔄 Live updates (2s)
          </span>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
          <div className="rounded-2xl border border-zinc-200/80 bg-white/70 p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Total Signups</span>
            <p className="text-2xl font-black mt-1 text-zinc-850 dark:text-zinc-50">{totalCount}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200/80 bg-white/70 p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Confirmed (RSVP)</span>
            <p className="text-2xl font-black mt-1 text-green-600 dark:text-green-400">{confirmedCount}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200/80 bg-white/70 p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Declined</span>
            <p className="text-2xl font-black mt-1 text-red-650 dark:text-red-400">{declinedCount}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200/80 bg-white/70 p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Pending</span>
            <p className="text-2xl font-black mt-1 text-zinc-500 dark:text-zinc-450">{pendingCount}</p>
          </div>
        </div>

        {/* Excel/CSV File Uploader Card */}
        <section className="mb-8">
          <div className="rounded-2xl border border-zinc-200/80 bg-white/70 p-6 shadow-md backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/40">
            <h2 className="text-base font-bold text-zinc-850 dark:text-zinc-100 flex items-center gap-2 mb-2">
              <span>📤</span> Upload Guest Sheet
            </h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">
              Add guests in bulk. System matches columns, screens duplicates, and fires the WhatsApp bot invitations automatically.
            </p>

            {/* Drag & Drop Zone */}
            {parsedGuests.length === 0 && (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragActive
                    ? "border-indigo-500 bg-indigo-500/5 dark:bg-indigo-550/5"
                    : "border-zinc-200 hover:border-zinc-350 dark:border-zinc-800 dark:hover:border-zinc-700 bg-zinc-50/20"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv, .xlsx, .xls"
                  className="hidden"
                />
                <svg className="mx-auto h-8 w-8 text-zinc-450 dark:text-zinc-500 mb-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                </svg>
                <p className="text-sm font-semibold">Drag & drop your guest list here, or browse files</p>
                <p className="text-[10px] text-zinc-400 mt-1">Accepts CSV, XLSX, XLS spreadsheet formats</p>
              </div>
            )}

            {/* Parsing/Processing Error */}
            {uploadError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-500/5 p-4 text-xs font-semibold text-red-500 dark:border-red-550/10">
                ⚠️ {uploadError}
              </div>
            )}

            {/* File Selected & Preview Mode */}
            {parsedGuests.length > 0 && (
              <div className="mt-4 border border-zinc-250/50 rounded-xl p-4 bg-zinc-50/20 dark:border-zinc-800/80">
                <div className="flex items-center justify-between border-b border-zinc-200/50 pb-3 dark:border-zinc-800/50">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">File Selected</p>
                    <p className="text-sm font-bold text-indigo-650 dark:text-indigo-400 mt-0.5">{fileName}</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800">
                    📋 {parsedGuests.length} Guests Mapped
                  </span>
                </div>

                {/* Micro preview grid */}
                <div className="mt-3 overflow-x-auto max-h-32">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-zinc-450 border-b border-zinc-200/30 pb-1">
                        <th className="py-1">Name</th>
                        <th className="py-1">Email</th>
                        <th className="py-1">WhatsApp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/20">
                      {parsedGuests.slice(0, 3).map((g, idx) => (
                        <tr key={idx} className="opacity-80">
                          <td className="py-1.5 font-medium">{g.full_name || "—"}</td>
                          <td className="py-1.5">{g.email || "—"}</td>
                          <td className="py-1.5">{g.phone || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedGuests.length > 3 && (
                    <p className="text-[10px] text-zinc-450 italic mt-1">+ {parsedGuests.length - 3} more rows</p>
                  )}
                </div>

                <div className="mt-4 flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setParsedGuests([]);
                      setFileName("");
                    }}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-bold hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={uploadGuests}
                    disabled={uploading}
                    className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-650 px-5 py-2 text-xs font-bold text-white shadow-sm hover:scale-[1.01] disabled:opacity-50"
                  >
                    {uploading ? "⏳ Uploading & Messaging…" : "🚀 Import & Send Invites"}
                  </button>
                </div>
              </div>
            )}

            {/* Upload Report Panel */}
            {uploadResult && (
              <div className="mt-4 rounded-xl border border-green-550/30 bg-green-500/[0.01] p-5">
                <div className="flex items-center justify-between border-b border-green-500/10 pb-3">
                  <h3 className="text-sm font-bold text-green-600 dark:text-green-400 flex items-center gap-1.5">
                    <span>✓</span> Import Outreach Completed
                  </h3>
                  <button
                    onClick={() => setUploadResult(null)}
                    className="text-xs font-semibold text-zinc-400 hover:text-zinc-650"
                  >
                    Dismiss
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 text-center sm:grid-cols-4">
                  <div className="bg-white/40 dark:bg-zinc-950/20 rounded-lg p-2.5 border border-green-500/10">
                    <span className="text-[9px] font-bold text-zinc-450 uppercase block">Added</span>
                    <span className="text-lg font-black text-green-600">{uploadResult.added}</span>
                  </div>
                  <div className="bg-white/40 dark:bg-zinc-950/20 rounded-lg p-2.5 border border-green-500/10">
                    <span className="text-[9px] font-bold text-zinc-450 uppercase block">Duplicates Skipped</span>
                    <span className="text-lg font-black text-zinc-500">{uploadResult.skipped}</span>
                  </div>
                  <div className="bg-white/40 dark:bg-zinc-950/20 rounded-lg p-2.5 border border-green-500/10 col-span-2">
                    <span className="text-[9px] font-bold text-zinc-450 uppercase block">Outreach Status</span>
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200 mt-1 block">WhatsApp Bot RAG Dispatched</span>
                  </div>
                </div>

                {uploadResult.logs.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Outreach Logs</p>
                    <div className="max-h-32 overflow-y-auto bg-zinc-950 text-[11px] font-mono text-zinc-350 p-3 rounded-lg space-y-1.5 border border-zinc-800">
                      {uploadResult.logs.map((log, idx) => (
                        <div key={idx} className="border-b border-zinc-900 pb-1.5 last:border-b-0">
                          <div className="flex justify-between font-bold">
                            <span className="text-indigo-400">{log.recipient} ({log.phone})</span>
                            <span className="text-green-500">{log.status}</span>
                          </div>
                          <p className="text-zinc-500 mt-0.5 leading-relaxed truncate">{log.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Search Input & Table Controls */}
        <div className="mb-6 max-w-md">
          <div className="relative flex items-center">
            <svg className="absolute left-3.5 h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by attendee name or email..."
              className="w-full rounded-xl border border-zinc-200 bg-white/70 py-2.5 pl-10 pr-4 text-sm transition-all focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950/50"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 text-xs text-zinc-400 hover:text-zinc-650"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Registrations List */}
        {registrations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/50 p-12 text-center dark:border-zinc-800 dark:bg-zinc-950/20">
            <svg className="mx-auto h-12 w-12 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="mt-4 text-sm font-semibold opacity-70">No registrations captured yet</p>
            <p className="mt-1 text-xs opacity-50">
              Upload a guest spreadsheet above or submit attendee signups to list them here.
            </p>
          </div>
        ) : filteredRegs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/50 p-12 text-center dark:border-zinc-800 dark:bg-zinc-950/20">
            <p className="text-sm font-semibold opacity-70">No matching search results</p>
            <p className="mt-1 text-xs opacity-50">Try checking for typos or clear the search filter.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm bg-white/40 dark:bg-zinc-900/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-zinc-100/80 border-b border-zinc-200 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/60 dark:border-zinc-800 dark:text-zinc-400">
                    <th className="px-6 py-4">Attendee Name</th>
                    <th className="px-6 py-4">Email Address</th>
                    <th className="px-6 py-4">WhatsApp / Phone</th>
                    <th className="px-6 py-4">RSVP Status</th>
                    <th className="px-6 py-4">Registration Date</th>
                    <th className="px-6 py-4">Public Chat Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filteredRegs.map((reg) => (
                    <tr key={reg.id} className="hover:bg-white/30 dark:hover:bg-zinc-950/10 transition-colors">
                      <td className="px-6 py-4 font-semibold text-zinc-850 dark:text-zinc-100">{reg.full_name ?? "—"}</td>
                      <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{reg.email ?? "—"}</td>
                      <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{reg.phone ?? "—"}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                            RSVP_STYLES[reg.rsvp_status] ?? RSVP_STYLES.pending
                          }`}
                        >
                          {reg.rsvp_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-zinc-400">
                        {new Date(reg.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => copyLink(reg)}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all focus:outline-none ${
                            copiedId === reg.id
                              ? "border-green-500/35 bg-green-500/10 text-green-600 dark:text-green-400"
                              : "border-zinc-200 bg-white hover:border-zinc-455 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                          }`}
                        >
                          {copiedId === reg.id ? (
                            <>
                              <span>✓</span> Copied Link!
                            </>
                          ) : (
                            <>
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
                              </svg>
                              Copy Chat Link
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
