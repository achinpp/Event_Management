"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  venue: string | null;
  status: string;
  created_at: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminPage() {
  const { data, isLoading, mutate } = useSWR<{ events: EventRow[] }>(
    "/api/events",
    fetcher
  );
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function createEvent(formData: FormData) {
    setCreating(true);
    setFormError(null);
    const startsAt = formData.get("starts_at") as string;
    const body = {
      title: formData.get("title"),
      description: formData.get("description"),
      starts_at: startsAt ? new Date(startsAt).toISOString() : undefined,
      venue: (formData.get("venue") as string) || undefined,
      contact_name: (formData.get("contact_name") as string) || undefined,
      contact_email: (formData.get("contact_email") as string) || undefined,
      contact_phone: (formData.get("contact_phone") as string) || undefined,
    };
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setCreating(false);
    if (!res.ok) {
      setFormError(json.error ?? `request failed (${res.status})`);
      return;
    }
    mutate();
    router.push(`/admin/events/${json.event.id}`);
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold">EventPilot</h1>
      <p className="mt-1 text-sm opacity-70">
        Create an event, generate a campaign, schedule it.
      </p>

      <section className="mt-8 rounded-xl border border-neutral-300 p-5 dark:border-neutral-700">
        <h2 className="font-semibold">New event</h2>
        <form action={createEvent} className="mt-4 grid gap-3">
          <input
            name="title"
            required
            placeholder="Event title"
            className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
          />
          <textarea
            name="description"
            required
            rows={5}
            placeholder="Describe the event: what happens, who it's for, logistics (venue, food, parking, times). This text becomes the chatbot's knowledge base — the more detail, the better it answers."
            className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="starts_at"
              type="datetime-local"
              className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
            />
            <input
              name="venue"
              placeholder="Venue"
              className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
            />
            <input
              name="contact_name"
              placeholder="Contact name"
              className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
            />
            <input
              name="contact_email"
              type="email"
              placeholder="Contact email"
              className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
            />
            <input
              name="contact_phone"
              placeholder="Contact phone"
              className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
            />
          </div>
          {formError && <p className="text-sm text-red-500">{formError}</p>}
          <button
            type="submit"
            disabled={creating}
            className="justify-self-start rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create event"}
          </button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="font-semibold">Events</h2>
        {isLoading && <p className="mt-3 text-sm opacity-70">Loading…</p>}
        <ul className="mt-3 grid gap-2">
          {data?.events?.map((event) => (
            <li key={event.id}>
              <Link
                href={`/admin/events/${event.id}`}
                className="flex items-center justify-between rounded-xl border border-neutral-300 px-4 py-3 transition-colors hover:border-blue-500 dark:border-neutral-700"
              >
                <span>
                  <span className="font-medium">{event.title}</span>
                  <span className="ml-2 text-sm opacity-60">
                    {event.venue ?? ""}
                  </span>
                </span>
                <span className="text-xs opacity-60">
                  {event.starts_at
                    ? new Date(event.starts_at).toLocaleDateString()
                    : "no date"}
                </span>
              </Link>
            </li>
          ))}
          {data?.events?.length === 0 && (
            <li className="text-sm opacity-70">No events yet.</li>
          )}
        </ul>
      </section>
    </main>
  );
}
