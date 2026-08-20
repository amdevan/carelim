"use client";

import { useState, useEffect, useCallback } from "react";
import { apiUrl } from "@/lib/api";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Stethoscope,
  Star,
  Building2,
  ArrowRight,
  Heart,
} from "lucide-react";

interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  color: string;
  doctorCount: number;
}

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  qualification: string;
  experience: number;
  consultationFee: number;
  rating: number;
  avatar: string | null;
  department: { id: string; name: string; color: string };
  workingDays: string;
  startTime: string;
  endTime: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
  booked: number;
  capacity: number;
}

interface BookingResult {
  id: string;
  tokenNo: number;
  date: string;
  time: string;
  doctor: string;
  department: string;
  fee: number;
  patient: string;
}

const STEPS = ["Department", "Doctor", "Date & Time", "Your Info", "Confirm"];

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);

const formatDateLong = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatTime12 = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
};

export default function BookingPage() {
  const [step, setStep] = useState(0);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);

  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState("");
  const [reason, setReason] = useState("");

  const [loadingDepts, setLoadingDepts] = useState(true);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);

  useEffect(() => {
    setLoadingDepts(true);
    fetch(apiUrl("/api/public/booking?action=departments"))
      .then((r) => { if (!r.ok) throw new Error("Failed to load"); return r.json(); })
      .then((data: Department[]) => setDepartments(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingDepts(false));
  }, []);

  useEffect(() => {
    if (!selectedDept) return;
    setLoadingDoctors(true);
    setDoctors([]);
    fetch(apiUrl(`/api/public/booking?action=doctors&departmentId=${selectedDept.id}`))
      .then((r) => { if (!r.ok) throw new Error("Failed to load"); return r.json(); })
      .then((data: Doctor[]) => setDoctors(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingDoctors(false));
  }, [selectedDept]);

  const fetchSlots = useCallback(async (dateStr: string) => {
    if (!selectedDoctor || !dateStr) return;
    setLoadingSlots(true);
    setSlots([]);
    try {
      const r = await fetch(apiUrl(`/api/public/booking?action=slots&doctorId=${selectedDoctor.id}&date=${dateStr}`));
      if (!r.ok) throw new Error("Failed to load slots");
      const data = await r.json();
      setSlots(data.slots || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load slots");
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedDoctor]);

  useEffect(() => {
    if (selectedDate && selectedDoctor) fetchSlots(selectedDate);
  }, [selectedDate, selectedDoctor, fetchSlots]);

  const canNext = () => {
    if (step === 0) return !!selectedDept;
    if (step === 1) return !!selectedDoctor;
    if (step === 2) return !!selectedDate && !!selectedTime;
    if (step === 3) return patientName.trim().length > 0 && patientPhone.trim().length >= 7;
    return true;
  };

  const goNext = () => { if (step < STEPS.length - 1 && canNext()) { setStep(step + 1); setError(null); } };
  const goBack = () => { if (step > 0) setStep(step - 1); setError(null); };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/public/booking"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: selectedDoctor!.id,
          departmentId: selectedDept!.id,
          date: selectedDate,
          time: selectedTime,
          patientName: patientName.trim(),
          patientPhone: patientPhone.trim(),
          patientEmail: patientEmail.trim() || undefined,
          patientAge: patientAge || undefined,
          patientGender: patientGender || undefined,
          reason: reason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed");
      setBookingResult(data.appointment);
      setStep(4);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const availableDates = (() => {
    const dates: { value: string; label: string; dayShort: string; dayNum: number; isToday: boolean }[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push({
        value: d.toISOString().split("T")[0],
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        dayShort: d.toLocaleDateString("en-US", { weekday: "short" }),
        dayNum: d.getDate(),
        isToday: i === 0,
      });
    }
    return dates;
  })();

  const isDoctorWorking = (dateStr: string) => {
    if (!selectedDoctor) return true;
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const d = new Date(dateStr);
    return selectedDoctor.workingDays.split(",").map((w) => w.trim()).includes(dayNames[d.getDay()]);
  };

  // ===== Success Screen =====
  if (bookingResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <Stethoscope className="h-8 w-8 text-teal-600 mx-auto mb-2" />
            <span className="text-lg font-bold text-gray-900">Carelim</span>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="h-8 w-8 text-teal-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Booking Confirmed</h1>
            <p className="text-sm text-gray-500 mb-6">Your appointment has been booked successfully</p>

            <div className="text-left bg-gray-50 rounded-xl p-5 mb-6">
              <div className="text-center mb-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Token Number</p>
                <p className="text-4xl font-bold text-teal-600 mt-1">#{bookingResult.tokenNo}</p>
              </div>
              <div className="border-t border-gray-200 pt-4 space-y-3">
                {[
                  ["Patient", bookingResult.patient],
                  ["Doctor", `Dr. ${bookingResult.doctor}`],
                  ["Department", bookingResult.department],
                  ["Date", formatDateLong(bookingResult.date)],
                  ["Time", formatTime12(bookingResult.time)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-medium text-gray-900">{value}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Fee</span>
                    <span className="text-lg font-bold text-teal-600">Rs. {formatCurrency(bookingResult.fee)}</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 mb-5">Please arrive 10 minutes before your appointment</p>
            <button
              onClick={() => {
                setBookingResult(null);
                setStep(0);
                setSelectedDept(null);
                setSelectedDoctor(null);
                setSelectedDate("");
                setSelectedTime("");
                setPatientName("");
                setPatientPhone("");
                setPatientEmail("");
                setPatientAge("");
                setPatientGender("");
                setReason("");
              }}
              className="w-full bg-teal-600 text-white py-3 rounded-xl font-medium text-sm hover:bg-teal-700 transition-colors"
            >
              Book Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== Main Flow =====
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Stethoscope className="h-6 w-6 text-teal-600" />
            <span className="text-base font-bold text-gray-900">Carelim</span>
          </div>
          <span className="text-xs text-gray-400 hidden sm:block">Book an Appointment</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {/* Simple Step Indicator */}
        <div className="flex items-center gap-1 mb-6">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1 flex items-center gap-1">
              <div className={`h-1 flex-1 rounded-full transition-colors ${i < step ? "bg-teal-500" : i === step ? "bg-teal-500" : "bg-gray-200"}`} />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm font-semibold text-gray-900">{STEPS[step]}</p>
          <p className="text-xs text-gray-400">{step + 1} of {STEPS.length}</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Step 0 — Department */}
          {step === 0 && (
            <div className="p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Which department?</h2>
              <p className="text-sm text-gray-400 mb-5">Select the type of care you need</p>

              {loadingDepts ? (
                <div className="space-y-2.5">
                  {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />)}
                </div>
              ) : departments.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No departments available</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {departments.map((dept) => {
                    const isActive = selectedDept?.id === dept.id;
                    return (
                      <button
                        key={dept.id}
                        onClick={() => { setSelectedDept(dept); setSelectedDoctor(null); setSelectedDate(""); setSelectedTime(""); }}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
                          isActive ? "border-teal-500 bg-teal-50/50" : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: dept.color || "#0d9488" }}>
                          <Building2 className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{dept.name}</p>
                          <p className="text-xs text-gray-400">{dept.doctorCount} {dept.doctorCount === 1 ? "doctor" : "doctors"}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-300 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 1 — Doctor */}
          {step === 1 && (
            <div className="p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Choose a doctor</h2>
              <p className="text-sm text-gray-400 mb-5">{selectedDept?.name}</p>

              {loadingDoctors ? (
                <div className="space-y-2.5">
                  {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-50 rounded-xl animate-pulse" />)}
                </div>
              ) : doctors.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Stethoscope className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No doctors available in this department</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {doctors.map((doc) => {
                    const isActive = selectedDoctor?.id === doc.id;
                    return (
                      <button
                        key={doc.id}
                        onClick={() => { setSelectedDoctor(doc); setSelectedDate(""); setSelectedTime(""); }}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                          isActive ? "border-teal-500 bg-teal-50/50" : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
                            style={{ backgroundColor: doc.department.color || "#0d9488" }}>
                            {doc.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-gray-900">Dr. {doc.name}</p>
                              {isActive && <CheckCircle className="h-4 w-4 text-teal-600 shrink-0" />}
                            </div>
                            <p className="text-xs text-teal-600 mt-0.5">{doc.specialization}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                              {doc.experience > 0 && <span>{doc.experience} yr exp</span>}
                              <span className="flex items-center gap-0.5">
                                <Star className="h-3 w-3 text-amber-400 fill-amber-400" />{doc.rating.toFixed(1)}
                              </span>
                              <span className="font-semibold text-gray-700">Rs. {formatCurrency(doc.consultationFee)}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 2 — Date & Time */}
          {step === 2 && (
            <div className="p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Pick a date & time</h2>
              <p className="text-sm text-gray-400 mb-5">Dr. {selectedDoctor?.name}</p>

              {/* Dates */}
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2.5">Date</p>
              <div className="flex gap-2 overflow-x-auto pb-3 mb-5 -mx-1 px-1">
                {availableDates.map((d) => {
                  const working = isDoctorWorking(d.value);
                  const isActive = selectedDate === d.value;
                  return (
                    <button
                      key={d.value}
                      disabled={!working}
                      onClick={() => { setSelectedDate(d.value); setSelectedTime(""); }}
                      className={`flex-shrink-0 w-[4.25rem] py-2.5 rounded-xl border text-center transition-all ${
                        !working
                          ? "border-gray-100 bg-gray-50/50 text-gray-300 cursor-not-allowed"
                          : isActive
                            ? "border-teal-500 bg-teal-50 text-teal-700"
                            : "border-gray-100 hover:border-gray-200 text-gray-600"
                      }`}
                    >
                      <p className="text-[10px] font-medium uppercase">{d.dayShort}</p>
                      <p className={`text-lg font-bold leading-tight ${isActive ? "text-teal-600" : ""}`}>{d.dayNum}</p>
                      <p className="text-[10px] text-gray-400">{d.label.split(" ")[0]}</p>
                      {d.isToday && <span className="text-[9px] font-medium text-teal-500">Today</span>}
                    </button>
                  );
                })}
              </div>

              {/* Time Slots */}
              {selectedDate && (
                <>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2.5">Time</p>
                  {loadingSlots ? (
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-11 bg-gray-50 rounded-lg animate-pulse" />)}
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No slots available</p>
                      <p className="text-xs mt-1">Try a different date</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {slots.map((slot) => {
                        const isActive = selectedTime === slot.time;
                        return (
                          <button
                            key={slot.time}
                            disabled={!slot.available}
                            onClick={() => setSelectedTime(slot.time)}
                            className={`py-2.5 rounded-lg border text-sm font-medium transition-all ${
                              !slot.available
                                ? "border-gray-100 bg-gray-50/50 text-gray-300 cursor-not-allowed line-through"
                                : isActive
                                  ? "border-teal-500 bg-teal-50 text-teal-700"
                                  : "border-gray-100 text-gray-600 hover:border-gray-200"
                            }`}
                          >
                            {formatTime12(slot.time)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 3 — Patient Details */}
          {step === 3 && (
            <div className="p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Your information</h2>
              <p className="text-sm text-gray-400 mb-5">Tell us about yourself</p>

              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                    <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Phone Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                    <input type="tel" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="9800000000"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Email <span className="text-gray-300">(optional)</span></label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                    <input type="email" value={patientEmail} onChange={(e) => setPatientEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Age</label>
                    <input type="number" min={0} max={150} value={patientAge} onChange={(e) => setPatientAge(e.target.value)}
                      placeholder="—"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Gender</label>
                    <select value={patientGender} onChange={(e) => setPatientGender(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition bg-white">
                      <option value="">—</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Reason <span className="text-gray-300">(optional)</span></label>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)}
                    placeholder="Brief reason for your visit..."
                    rows={2}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition resize-none" />
                </div>
              </div>
            </div>
          )}

          {/* Step 4 — Confirmation */}
          {step === 4 && !bookingResult && (
            <div className="p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Review & confirm</h2>
              <p className="text-sm text-gray-400 mb-5">Check your booking details</p>

              {/* Doctor summary */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-3">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
                  style={{ backgroundColor: selectedDept?.color || "#0d9488" }}>
                  {selectedDoctor?.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">Dr. {selectedDoctor?.name}</p>
                  <p className="text-xs text-gray-500">{selectedDoctor?.specialization}</p>
                </div>
              </div>

              {/* Details */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
                {[
                  ["Department", selectedDept?.name],
                  ["Date", selectedDate ? formatDateLong(selectedDate) : ""],
                  ["Time", selectedTime ? formatTime12(selectedTime) : ""],
                  ["Patient", patientName],
                  ["Phone", patientPhone],
                  ...(patientEmail ? [["Email", patientEmail]] : []),
                  ...(patientAge ? [["Age", patientAge]] : []),
                  ...(patientGender ? [["Gender", patientGender]] : []),
                  ...(reason ? [["Reason", reason]] : []),
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-medium text-gray-900 text-right max-w-[60%]">{value}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-2.5 mt-2.5">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Consultation Fee</span>
                    <span className="text-base font-bold text-teal-600">Rs. {formatCurrency(selectedDoctor?.consultationFee || 0)}</span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-gray-400 text-center mt-4 mb-5">Please arrive 10 minutes before your appointment</p>

              <button onClick={handleSubmit} disabled={submitting}
                className="w-full bg-teal-600 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Booking...</>
                ) : (
                  <><CheckCircle className="h-4 w-4" /> Confirm Booking</>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        {step < 4 && (
          <div className="flex gap-3 mt-4">
            {step > 0 && (
              <button onClick={goBack}
                className="bg-white border border-gray-200 text-gray-600 px-5 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-1.5">
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            )}
            <button onClick={goNext} disabled={!canNext()}
              className={`flex-1 bg-teal-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 ${step === 0 ? "flex-1" : ""}`}>
              {step === 3 ? "Review" : "Continue"}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 pb-4 flex items-center justify-center gap-1.5 text-xs text-gray-300">
          <Heart className="h-3 w-3" /> Powered by <span className="font-medium text-teal-500">Carelim OS</span>
        </div>
      </div>
    </div>
  );
}
