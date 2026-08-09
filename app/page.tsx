"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function Home() {
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<"campaign" | "chatbot">("campaign");

  return (
    <div className="isolate min-h-screen bg-zinc-50 text-zinc-900 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-50">
      
      {/* 1. Header/Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200/50 bg-white/85 backdrop-blur-md transition-colors duration-300 dark:border-zinc-800/50 dark:bg-zinc-950/85">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-sans text-xl font-bold tracking-tight">
            {/* SVG Logo - Plane icon */}
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
              EventPilot
            </span>
          </Link>

          <nav className="hidden gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
              Features
            </a>
            <a href="#workflow" className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
              How It Works
            </a>
            <a href="#showcase" className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
              Showcase
            </a>
            <a href="#faq" className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
              FAQs
            </a>
          </nav>

          <div>
            <Link
              href="/admin"
              className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-semibold text-white shadow-md transition-all hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Launch Console
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        {/* Glow Blobs */}
        <div className="absolute top-1/4 left-1/2 -z-10 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/10 blur-[120px] dark:bg-violet-600/15" />
        <div className="absolute top-1/3 left-1/3 -z-10 h-[300px] w-[350px] rounded-full bg-cyan-500/10 blur-[100px] dark:bg-cyan-500/15" />

        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="mx-auto mb-6 flex max-w-fit items-center gap-2 rounded-full border border-violet-200/50 bg-violet-50/50 px-4 py-1.5 text-xs font-semibold text-violet-700 backdrop-blur-sm dark:border-violet-500/20 dark:bg-violet-900/10 dark:text-violet-300">
            <span className="flex h-2.5 w-2.5 items-center justify-center">
              <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-500"></span>
            </span>
            Next-Gen AI Event Orchestration
          </div>

          <h1 className="mx-auto max-w-4xl text-5xl font-black tracking-tight sm:text-7xl">
            Streamline Your Event Marketing With{" "}
            <span className="bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-500 bg-clip-text text-transparent dark:from-violet-400 dark:via-indigo-400 dark:to-cyan-400">
              Generative AI
            </span>
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            Configure events, synthesize multi-day social media campaigns, schedule posts, and launch smart attendee chatbots trained directly on your event guidelines.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/admin"
              className="group relative inline-flex h-12 w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-8 text-base font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] hover:shadow-indigo-600/35 sm:w-auto"
            >
              Get Started Free
              <svg
                className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <a
              href="#showcase"
              className="inline-flex h-12 w-full items-center justify-center rounded-full border border-zinc-200 bg-white px-8 text-base font-semibold text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-200 dark:hover:bg-zinc-850 sm:w-auto"
            >
              Explore Console Layout
            </a>
          </div>
        </div>
      </section>

      {/* 3. Product Showcase Mockup */}
      <section id="showcase" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="rounded-2xl border border-zinc-200/80 bg-zinc-100 p-3 shadow-xl transition-all dark:border-zinc-800/80 dark:bg-zinc-900/40">
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            
            {/* Mockup Header Bar */}
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full bg-red-400 dark:bg-red-500/70" />
                <span className="h-3.5 w-3.5 rounded-full bg-yellow-400 dark:bg-yellow-500/70" />
                <span className="h-3.5 w-3.5 rounded-full bg-green-400 dark:bg-green-500/70" />
                <span className="ml-4 font-mono text-xs text-zinc-400 dark:text-zinc-500">console.eventpilot.ai/events/summit</span>
              </div>
              <div className="flex rounded-lg border border-zinc-200/60 p-0.5 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                <button
                  onClick={() => setActiveShowcaseTab("campaign")}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                    activeShowcaseTab === "campaign"
                      ? "bg-white shadow text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                  }`}
                >
                  Campaign Planner
                </button>
                <button
                  onClick={() => setActiveShowcaseTab("chatbot")}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                    activeShowcaseTab === "chatbot"
                      ? "bg-white shadow text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                  }`}
                >
                  Attendee AI Assistant
                </button>
              </div>
            </div>

            {/* Showcase Viewport */}
            <div className="min-h-[460px] p-6">
              {activeShowcaseTab === "campaign" ? (
                <div className="flex flex-col gap-6 animate-fadeIn">
                  <div className="flex flex-col justify-between gap-4 border-b border-zinc-150 pb-5 dark:border-zinc-800 sm:flex-row sm:items-center">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Marketing Campaign Pipeline</span>
                      <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">AI Summit Colombo 2026</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-950/30 dark:text-green-400">
                        Campaign Generated
                      </span>
                      <span className="text-xs text-zinc-400">3 Posts Synced</span>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-3">
                    {/* Post Card 1 */}
                    <div className="flex flex-col justify-between rounded-xl border border-zinc-200/70 bg-zinc-50/50 p-5 dark:border-zinc-800/60 dark:bg-zinc-900/30">
                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-xs font-bold text-violet-600 dark:text-violet-400">1. COMING SOON</span>
                          <span className="text-xs text-zinc-400">2 Weeks Prior</span>
                        </div>
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                          "AI Summit Colombo is coming soon! Join expert speakers, hands-on workshops, and startup networking."
                        </p>
                        <div className="mt-4 flex flex-wrap gap-1">
                          <span className="text-xs text-indigo-500">#AISummit</span>
                          <span className="text-xs text-indigo-500">#Colombo</span>
                        </div>
                      </div>
                      <div className="mt-6 flex items-center justify-between border-t border-zinc-200/50 pt-4 dark:border-zinc-800/50">
                        <span className="text-xs text-zinc-500">Auto-generated image brief</span>
                        <div className="h-6 w-6 rounded bg-gradient-to-tr from-violet-500 to-indigo-500 opacity-80" />
                      </div>
                    </div>

                    {/* Post Card 2 */}
                    <div className="flex flex-col justify-between rounded-xl border border-indigo-200 bg-indigo-50/20 p-5 dark:border-indigo-900/30 dark:bg-indigo-950/10">
                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">2. REGISTRATION OPEN</span>
                          <span className="text-xs text-zinc-400">10 Days Prior</span>
                        </div>
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                          "Registration is open for AI Summit Colombo. Save your seat for expert talks, workshops, and networking."
                        </p>
                        <div className="mt-4 flex flex-wrap gap-1">
                          <span className="text-xs text-indigo-500">#RegisterNow</span>
                          <span className="text-xs text-indigo-500">#AIConference</span>
                        </div>
                      </div>
                      <div className="mt-6 flex items-center justify-between border-t border-zinc-200/50 pt-4 dark:border-zinc-800/50">
                        <span className="text-xs text-zinc-500">Auto-generated image brief</span>
                        <div className="h-6 w-6 rounded bg-gradient-to-tr from-indigo-500 to-cyan-500 opacity-85" />
                      </div>
                    </div>

                    {/* Post Card 3 */}
                    <div className="flex flex-col justify-between rounded-xl border border-zinc-200/70 bg-zinc-50/50 p-5 dark:border-zinc-800/60 dark:bg-zinc-900/30">
                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">3. URGENT REMINDER</span>
                          <span className="text-xs text-zinc-400">2 Days Prior</span>
                        </div>
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                          "Last chance to register for AI Summit Colombo. Don't miss practical sessions and startup demos."
                        </p>
                        <div className="mt-4 flex flex-wrap gap-1">
                          <span className="text-xs text-indigo-500">#LastChance</span>
                          <span className="text-xs text-indigo-500">#AISummit</span>
                        </div>
                      </div>
                      <div className="mt-6 flex items-center justify-between border-t border-zinc-200/50 pt-4 dark:border-zinc-800/50">
                        <span className="text-xs text-zinc-500">Auto-generated image brief</span>
                        <div className="h-6 w-6 rounded bg-gradient-to-tr from-cyan-500 to-teal-500 opacity-80" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-xl animate-fadeIn">
                  <div className="mb-4 flex items-center gap-3 border-b border-zinc-150 pb-4 dark:border-zinc-800">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-650 text-white font-bold dark:bg-violet-600">
                      EP
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">AI Assistant for Summit</h4>
                      <p className="text-xs text-zinc-400">Trained on Event Description guidelines</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Chat Bubble 1 */}
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl rounded-tl-none bg-zinc-100 px-4 py-3 text-sm text-zinc-850 dark:bg-zinc-900 dark:text-zinc-200">
                        Hello! I am your Event Assistant. Ask me anything about AI Summit Colombo 2026.
                      </div>
                    </div>

                    {/* Chat Bubble 2 */}
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-tr-none bg-indigo-600 px-4 py-3 text-sm text-white dark:bg-indigo-650">
                        Where is it held, and how can I sign up?
                      </div>
                    </div>

                    {/* Chat Bubble 3 */}
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl rounded-tl-none bg-zinc-100 px-4 py-3 text-sm text-zinc-850 dark:bg-zinc-900 dark:text-zinc-200">
                        The summit is scheduled at the **Grand Convention Center, Colombo**. 
                        You can sign up instantly by typing your name and email here, or by clicking the **Register Now** link at the bottom of the portal!
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex gap-2 border-t border-zinc-150 pt-4 dark:border-zinc-800">
                    <input
                      type="text"
                      disabled
                      placeholder="Ask the AI Assistant..."
                      className="w-full rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
                    />
                    <button disabled className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white dark:bg-indigo-500">
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Bento Grid Features Section */}
      <section id="features" className="bg-zinc-100/50 py-24 dark:bg-zinc-900/30">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Robust Feature Stack</h2>
            <p className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Everything required to pilot your event promotion</p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-6">
            
            {/* Bento Card 1 - AI Event Setup (3 cols) */}
            <div className="col-span-6 flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-8 transition-all hover:border-violet-500/40 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-950 sm:col-span-3">
              <div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <h3 className="mt-6 text-lg font-bold">Fast Event Setup</h3>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Provide your basic event outline, logistics, contacts, and custom guidelines. This inputs details directly into your workspace.
                </p>
              </div>
            </div>

            {/* Bento Card 2 - Trained Chatbots (3 cols) */}
            <div className="col-span-6 flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-8 transition-all hover:border-indigo-500/40 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-950 sm:col-span-3">
              <div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                </div>
                <h3 className="mt-6 text-lg font-bold">Knowledge-Trained Assistant</h3>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Your event description acts as the chatbot's dynamic knowledge base. Participants get instant, accurate, 24/7 details automatically.
                </p>
              </div>
            </div>

            {/* Bento Card 3 - Social Campaigns (4 cols) */}
            <div className="col-span-6 flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-8 transition-all hover:border-cyan-500/40 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-950 sm:col-span-4">
              <div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600 dark:bg-cyan-950/50 dark:text-cyan-400">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                  </svg>
                </div>
                <h3 className="mt-6 text-lg font-bold">Synthesized Multi-Day Campaigns</h3>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Generate distinct post sequences structured specifically for coming-soon buzz, ticket launches, and registration countdown urgency in one single generation step.
                </p>
              </div>
            </div>

            {/* Bento Card 4 - Auto Scheduling (2 cols) */}
            <div className="col-span-6 flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-8 transition-all hover:border-purple-500/40 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-950 sm:col-span-2">
              <div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
                  </svg>
                </div>
                <h3 className="mt-6 text-lg font-bold">Campaign Scheduling</h3>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Easily review generated schedule windows, then confirm post-times directly from your workflow panel.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. How It Works Section */}
      <section id="workflow" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Dynamic Pipeline</h2>
            <p className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Configure and deploy in 4 clear steps</p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-4">
            
            {/* Step 1 */}
            <div className="relative flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-600 text-base font-bold text-white shadow-md">
                1
              </div>
              <h3 className="mt-6 text-base font-bold">Create & Describe</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 max-w-[200px]">
                Input event metadata and describe details (logistics, schedule, tickets).
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-base font-bold text-white shadow-md">
                2
              </div>
              <h3 className="mt-6 text-base font-bold">Train AI Engine</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 max-w-[200px]">
                The platform immediately indexes your event description as a dedicated knowledge base.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-600 text-base font-bold text-white shadow-md">
                3
              </div>
              <h3 className="mt-6 text-base font-bold">Generate Campaign</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 max-w-[200px]">
                AI synthesizes scheduled post captions, goal definitions, and visual asset suggestions.
              </p>
            </div>

            {/* Step 4 */}
            <div className="relative flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-650 text-base font-bold text-white shadow-md dark:bg-emerald-600">
                4
              </div>
              <h3 className="mt-6 text-base font-bold">Auto-Deploy Assistant</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 max-w-[200px]">
                Get a shareable tokenized URL where attendees chat with the assistant and register.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 6. FAQ Section */}
      <section id="faq" className="bg-zinc-100/50 py-24 dark:bg-zinc-900/30">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Got Questions?</h2>
            <p className="mt-3 text-3xl font-bold tracking-tight">Frequently Asked Questions</p>
          </div>

          <div className="space-y-6">
            
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <h4 className="text-base font-bold">How does the chatbot answer attendee queries?</h4>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                It queries the event details (venue, starts_at, description) that you write during setup. The AI matches user messages to this background knowledge to provide precise answers about dates, schedules, registration rules, and logistics.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <h4 className="text-base font-bold">Does this require an external AI API key?</h4>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                No. EventPilot integrates directly with Gemini AI out-of-the-box. As long as your configuration is active, the campaigns generate automatically, and chatbot operations function without manual API key setup.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <h4 className="text-base font-bold">Can participants register directly from the chatbot page?</h4>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Yes! Every event created generates a dedicated public token-based chat link. Attendees can converse with the AI assistant to learn about the event, and register with their contact information directly in the sidebar panel.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 7. Premium Call-To-Action Banner */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-700 px-8 py-16 text-center text-white shadow-2xl dark:from-violet-950 dark:to-indigo-950">
            {/* Glowing Graphic Details */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-60" />
            <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-cyan-400/20 blur-2xl" />
            
            <div className="relative z-10 mx-auto max-w-2xl">
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Ready to Pilot Your Next Event Campaign?</h2>
              <p className="mt-4 text-base opacity-80">
                Launch the event console, input your description, and watch the AI synthesize customized schedules, write captions, and power your support channels instantly.
              </p>
              <div className="mt-8 flex justify-center">
                <Link
                  href="/admin"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-base font-bold text-indigo-700 shadow-lg transition-transform hover:scale-[1.02] hover:bg-zinc-50"
                >
                  Create Event Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="border-t border-zinc-200 bg-white py-12 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-6 flex flex-col items-center justify-between gap-6 sm:flex-row text-center sm:text-left">
          <div>
            <div className="flex justify-center sm:justify-start items-center gap-2 font-bold tracking-tight">
              <svg
                className="h-5 w-5 text-indigo-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
              <span>EventPilot</span>
            </div>
            <p className="mt-2 text-xs text-zinc-400">© 2026 EventPilot AI Platform. All rights reserved.</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 text-xs font-semibold text-zinc-400">
            <span className="rounded-md bg-zinc-100 px-2.5 py-1 dark:bg-zinc-900">Next.js 16</span>
            <span className="rounded-md bg-zinc-100 px-2.5 py-1 dark:bg-zinc-900">Gemini AI</span>
            <span className="rounded-md bg-zinc-100 px-2.5 py-1 dark:bg-zinc-900">Supabase DB</span>
            <span className="rounded-md bg-zinc-100 px-2.5 py-1 dark:bg-zinc-900">Tailwind CSS v4</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
