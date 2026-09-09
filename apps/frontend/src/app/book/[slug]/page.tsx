"use client";

import { useState, useEffect, useMemo, use } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Calendar, Check, Loader2, Stethoscope, ArrowLeft, User, Phone, Mail,
  FileText, Shield, Clock, Sparkles, ChevronRight, Star, BadgeCheck, MapPin,
} from "lucide-react";

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  consultationFee: number | null;
  workingDays?: string;
  startTime?: string;
  endTime?: string;
}

interface Department {
  id: string;
  name: string;
}

/** Generate time slots from a doctor's schedule (24h start/end) with 30-min intervals */
function generateTimeSlots(startTime: string, endTime: string): string[] {
  const slots: string[] = [];
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  let current = startH * 60 + startM;
  const end = endH * 60 + endM;

  while (current < end) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    // Convert to 12-hour format with AM/PM
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    slots.push(`${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`);
    current += 30;
  }
  return slots;
}

const ACCENT_COLORS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-rose-500 to-pink-500",
  "from-amber-500 to-orange-500",
  "from-indigo-500 to-blue-600",
  "from-fuchsia-500 to-pink-500",
  "from-teal-500 to-emerald-500",
];

function getAccent(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return ACCENT_COLORS[Math.abs(hash) % ACCENT_COLORS.length];
}

export default function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const branchParam = searchParams.get("branch");
  const doctorParam = searchParams.get("doctor");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptFilter, setDeptFilter] = useState("all");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [step, setStep] = useState<"browse" | "book">("browse");
  const [branchLabel, setBranchLabel] = useState<string | null>(null);
  const [isDirectLink, setIsDirectLink] = useState(false);

  const [form, setForm] = useState({
    patientName: "",
    patientPhone: "",
    patientEmail: "",
    date: "",
    time: "",
    reason: "",
  });

  useEffect(() => {
    async function load() {
      try {
        // Build URL with slug and optional branch/doctor params
        let url = `/api/public-booking?slug=${encodeURIComponent(slug)}`;
        if (branchParam) url += `&branch=${branchParam}`;
        if (doctorParam) url += `&doctor=${doctorParam}`;

        const res = await fetch(url);
        const data = await res.json();
        console.log("Booking API response:", JSON.stringify(data.doctors?.slice(0, 2), null, 2));
        setDoctors(data.doctors || []);
        setDepartments(data.departments || []);

        // If a doctor is pre-selected (direct booking link), auto-select them
        if (doctorParam && data.doctors?.length === 1) {
          setSelectedDoctor(data.doctors[0]);
          setStep("book");
          setIsDirectLink(true);
        } else if (doctorParam && data.doctors?.length > 0) {
          // Find the exact doctor match
          const matched = data.doctors.find((d: Doctor) => d.id === doctorParam);
          if (matched) {
            setSelectedDoctor(matched);
            setStep("book");
            setIsDirectLink(true);
          }
        }

        // Fetch branch label if branch param provided
        if (branchParam) {
          try {
            const branchRes = await fetch(`/api/branches/${branchParam}`);
            if (branchRes.ok) {
              const branchData = await branchRes.json();
              setBranchLabel(branchData.name);
            }
          } catch {
            // Branch label is cosmetic; don't block
          }
        }
      } catch {
        setError("Failed to load booking form");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, branchParam, doctorParam]);

  const filteredDoctors = useMemo(() => {
    if (deptFilter === "all") return doctors;
    return doctors.filter((d) => d.specialization === deptFilter);
  }, [doctors, deptFilter]);

  const uniqueSpecializations = useMemo(() => {
    const specs = new Set(doctors.map((d) => d.specialization).filter(Boolean));
    return Array.from(specs).sort();
  }, [doctors]);

  const handleSelectDoctor = (doctor: Doctor) => {
    console.log("Selected doctor:", doctor.name, "schedule:", doctor.workingDays, doctor.startTime, "-", doctor.endTime);
    setSelectedDoctor(doctor);
    setStep("book");
    setError("");
  };

  const handleBack = () => {
    // If this is a direct doctor link, don't go back to browse
    if (isDirectLink) {
      return;
    }
    setStep("browse");
    setSelectedDoctor(null);
    setForm({ patientName: "", patientPhone: "", patientEmail: "", date: "", time: "", reason: "" });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/public-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: form.patientName,
          patientPhone: form.patientPhone,
          patientEmail: form.patientEmail || null,
          doctorId: selectedDoctor.id,
          doctorName: selectedDoctor.name,
          date: form.date,
          time: form.time,
          reason: form.reason || null,
          type: "online",
          linkSlug: slug,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Booking failed");
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to book appointment");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---- Loading ---- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-violet-500/20 blur-xl animate-pulse" />
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
        </div>
      </div>
    );
  }

  /* ---- Success ---- */
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative w-full max-w-md animate-[fadeIn_0.5s_ease-out]">
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl p-10 text-center space-y-6">
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
              <div className="relative w-full h-full rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Check className="w-10 h-10 text-white" strokeWidth={3} />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Booking Confirmed!</h2>
              <p className="text-white/60 text-sm leading-relaxed">
                Your appointment with <span className="text-white font-medium">{selectedDoctor?.name}</span> has been scheduled.
              </p>
            </div>
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-white/70">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>{form.date}</span>
              </div>
              <div className="flex items-center gap-2 text-white/70">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>{form.time}</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-white/40">
              <Shield className="w-3.5 h-3.5" />
              <span>We&apos;ll contact you shortly to confirm</span>
            </div>
            {!isDirectLink && (
              <button
                onClick={handleBack}
                className="w-full py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all"
              >
                Book Another Appointment
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ---- Step: Browse Doctors ---- */
  if (step === "browse") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] relative">
        {/* Background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-violet-500/8 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-purple-500/8 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 py-10">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="relative inline-flex mb-5">
              <div className="absolute inset-0 rounded-2xl bg-violet-500/20 blur-xl" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Stethoscope className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight">
              Book an <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">Appointment</span>
            </h1>
            {branchLabel && (
              <div className="flex items-center justify-center gap-1.5 text-violet-400 text-sm mb-2">
                <MapPin className="w-3.5 h-3.5" />
                <span>{branchLabel}</span>
              </div>
            )}
            <p className="text-white/50 text-sm max-w-md mx-auto">
              Choose your preferred doctor and schedule a visit in seconds
            </p>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            {[
              { icon: Shield, text: "Secure Booking" },
              { icon: BadgeCheck, text: "Verified Doctors" },
              { icon: Clock, text: "Instant Confirmation" },
            ].map((badge) => (
              <div key={badge.text} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/5 bg-white/[0.03]">
                <badge.icon className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-xs text-white/50">{badge.text}</span>
              </div>
            ))}
          </div>

          {/* Department Filter */}
          {uniqueSpecializations.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mb-8">
              <button
                onClick={() => setDeptFilter("all")}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all border ${
                  deptFilter === "all"
                    ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-500/25"
                    : "border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/[0.06] hover:text-white/70"
                }`}
              >
                All Specialties
                <span className="ml-1.5 text-[10px] opacity-70">{doctors.length}</span>
              </button>
              {uniqueSpecializations.map((spec) => {
                const count = doctors.filter((d) => d.specialization === spec).length;
                return (
                  <button
                    key={spec}
                    onClick={() => setDeptFilter(spec)}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition-all border ${
                      deptFilter === spec
                        ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-500/25"
                        : "border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/[0.06] hover:text-white/70"
                    }`}
                  >
                    {spec}
                    <span className="ml-1.5 text-[10px] opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Doctors Grid */}
          {filteredDoctors.length === 0 ? (
            <div className="text-center py-16">
              <Stethoscope className="w-14 h-14 mx-auto mb-4 text-white/10" />
              <p className="text-white/30 text-sm">No doctors found for this specialty</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDoctors.map((doctor, i) => {
                const accent = getAccent(doctor.id);
                return (
                  <button
                    key={doctor.id}
                    onClick={() => handleSelectDoctor(doctor)}
                    className="group relative text-left"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    {/* Hover glow */}
                    <div className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${accent} opacity-0 group-hover:opacity-20 blur transition-opacity duration-500`} />

                    <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-300">
                      <div className="flex items-start gap-4">
                        <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${accent} flex items-center justify-center shrink-0 shadow-lg`}>
                          <Stethoscope className="w-7 h-7 text-white" />
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#0a0a0f] flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate mb-0.5">{doctor.name}</h3>
                          <p className="text-xs text-white/40 truncate">{doctor.specialization}</p>
                          {doctor.consultationFee != null && (
                            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.06]">
                              <span className="text-[10px] text-white/40">Fee</span>
                              <span className="text-xs font-semibold text-white/80">Rs. {doctor.consultationFee.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className="w-3 h-3 text-amber-400/60 fill-amber-400/60" />
                          ))}
                          <span className="text-[10px] text-white/30 ml-1">Available</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-white/40 group-hover:text-violet-400 transition-colors">
                          Book
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 text-center">
            <p className="text-[11px] text-white/20">Powered by Carelim Health</p>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Step: Book Appointment ---- */
  return (
    <div className="min-h-screen bg-[#0a0a0f] relative">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-violet-500/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-purple-500/8 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-lg mx-auto px-4 py-8">
        {/* Back button */}
        {!isDirectLink && (
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to doctors
          </button>
        )}

        {/* Selected Doctor */}
        <div className="relative mb-6">
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-violet-500/20 to-purple-500/20 blur" />
          <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-5">
            <div className="flex items-center gap-4">
              <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${selectedDoctor ? getAccent(selectedDoctor.id) : ""} flex items-center justify-center shadow-lg`}>
                <Stethoscope className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-white text-lg">{selectedDoctor?.name}</h2>
                <p className="text-sm text-white/40">{selectedDoctor?.specialization}</p>
                {branchLabel && (
                  <div className="flex items-center gap-1 text-xs text-violet-400 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    <span>{branchLabel}</span>
                  </div>
                )}
                {selectedDoctor?.consultationFee != null && (
                  <p className="text-xs font-medium text-violet-400 mt-0.5">
                    Consultation Fee: Rs. {selectedDoctor.consultationFee.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date & Time Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-violet-400" />
                </div>
                <span className="text-sm font-semibold text-white">Select Date & Time</span>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <Label className="text-xs text-white/50 uppercase tracking-wider">Date</Label>
                <div className="relative">
                  <Input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    min={new Date().toISOString().split("T")[0]}
                    className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20 focus:border-violet-500/50 focus:ring-violet-500/20 h-11"
                  />
                </div>
              </div>

              {/* Time Slots */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-white/50 uppercase tracking-wider">Time Slot</Label>
                  {selectedDoctor?.startTime && selectedDoctor?.endTime && (
                    <span className="text-[10px] text-white/30">
                      {selectedDoctor.startTime} - {selectedDoctor.endTime}
                    </span>
                  )}
                </div>
                {(() => {
                  // Check if doctor works on selected day
                  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                  const selectedDate = form.date ? new Date(form.date + "T00:00:00") : null;
                  const dayName = selectedDate ? dayNames[selectedDate.getDay()] : null;
                  const workingDaysList = selectedDoctor?.workingDays?.split(",").map((d) => d.trim()) || [];
                  const isWorkingDay = !dayName || workingDaysList.length === 0 || workingDaysList.includes(dayName);

                  // Generate slots from doctor's schedule
                  const docStart = selectedDoctor?.startTime || "09:00";
                  const docEnd = selectedDoctor?.endTime || "17:00";
                  const slots = isWorkingDay ? generateTimeSlots(docStart, docEnd) : [];
                  console.log("Time slots:", { date: form.date, dayName, isWorkingDay, docStart, docEnd, slotsCount: slots.length, slots: slots.slice(0, 5) });

                  if (form.date && !isWorkingDay) {
                    return (
                      <div className="text-center py-6 text-white/30 text-sm">
                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        Dr. {selectedDoctor?.name} is not available on {dayName}
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {slots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setForm({ ...form, time: slot })}
                            className={`relative px-2 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                              form.time === slot
                                ? "bg-violet-600 text-white shadow-lg shadow-violet-500/25 border border-violet-500"
                                : "border border-white/[0.06] bg-white/[0.02] text-white/40 hover:bg-white/[0.05] hover:text-white/60 hover:border-white/[0.1]"
                            }`}
                          >
                            {form.time === slot && (
                              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20" />
                            )}
                            <span className="relative">{slot}</span>
                          </button>
                        ))}
                      </div>
                      {!form.time && slots.length > 0 && (
                        <p className="text-[10px] text-white/20 flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" /> Select a time slot
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

            {/* Patient Info Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-violet-400" />
                </div>
                <span className="text-sm font-semibold text-white">Your Information</span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-white/50 uppercase tracking-wider">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <Input
                      required
                      value={form.patientName}
                      onChange={(e) => setForm({ ...form, patientName: e.target.value })}
                      placeholder="e.g. Sita Sharma"
                      className="pl-10 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20 focus:border-violet-500/50 focus:ring-violet-500/20 h-11"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-white/50 uppercase tracking-wider">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <Input
                      required
                      value={form.patientPhone}
                      onChange={(e) => setForm({ ...form, patientPhone: e.target.value })}
                      placeholder="98XXXXXXXX"
                      className="pl-10 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20 focus:border-violet-500/50 focus:ring-violet-500/20 h-11"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-white/50 uppercase tracking-wider">Email <span className="opacity-50">(optional)</span></Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <Input
                      type="email"
                      value={form.patientEmail}
                      onChange={(e) => setForm({ ...form, patientEmail: e.target.value })}
                      placeholder="sita@mail.com"
                      className="pl-10 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20 focus:border-violet-500/50 focus:ring-violet-500/20 h-11"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-white/50 uppercase tracking-wider">Reason for Visit</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-white/20" />
                    <textarea
                      value={form.reason}
                      onChange={(e) => setForm({ ...form, reason: e.target.value })}
                      placeholder="Describe your symptoms or reason..."
                      rows={3}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-sm placeholder:text-white/20 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !form.date || !form.time}
              className="relative w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed group overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-600 group-hover:from-violet-500 group-hover:to-purple-500 transition-all" />
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-600 opacity-0 group-hover:opacity-100 blur-xl transition-opacity" />
              <span className="relative flex items-center justify-center gap-2">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Booking...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Confirm Booking
                  </>
                )}
              </span>
            </button>

            {/* Security note */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/20">
              <Shield className="w-3 h-3" />
              <span>Your information is secure and encrypted</span>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-[11px] text-white/20">Powered by Carelim Health</p>
        </div>
      </div>
    </div>
  );
}
