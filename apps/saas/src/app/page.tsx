"use client";

import Link from "next/link";

export default function AdminPortal() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-slate-900">Carelim Admin Portal</h1>
          <p className="mt-3 text-lg text-slate-600">Management & Operations Dashboard</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Admin */}
          <Link
            href="/admin"
            className="group block bg-white rounded-2xl border border-slate-200 p-8 hover:shadow-lg hover:border-teal-300 transition-all duration-200"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center mb-5">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 group-hover:text-teal-600 transition-colors">Admin Panel</h2>
            <p className="mt-2 text-sm text-slate-500">Tenant management, subscriptions, plans, analytics, and platform settings.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Tenants", "Plans", "Analytics", "Support"].map((tag) => (
                <span key={tag} className="text-xs bg-teal-50 text-teal-700 px-2 py-1 rounded-full">{tag}</span>
              ))}
            </div>
          </Link>

          {/* Marketing & CRM */}
          <Link
            href="/marketing"
            className="group block bg-white rounded-2xl border border-slate-200 p-8 hover:shadow-lg hover:border-purple-300 transition-all duration-200"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center mb-5">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 group-hover:text-purple-600 transition-colors">Marketing & CRM</h2>
            <p className="mt-2 text-sm text-slate-500">Campaigns, lead management, contacts, deals pipeline, and referrals.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Campaigns", "Leads", "Deals", "Referrals"].map((tag) => (
                <span key={tag} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">{tag}</span>
              ))}
            </div>
          </Link>
        </div>

        <p className="text-center text-xs text-slate-400 mt-8">Carelim Health &mdash; Admin Portal</p>
      </div>
    </div>
  );
}
