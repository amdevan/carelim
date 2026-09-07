// Carelim OS — Onboarding State Management
// Zustand store with auto-save to localStorage

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface BasicInfoData {
  // Organization
  clinicName: string;
  clinicType: string;
  registrationNumber: string;
  panVatNumber: string;
  country: string;
  stateProvince: string;
  city: string;
  fullAddress: string;
  googleMapLocation: string;
  // Administrator
  adminFullName: string;
  adminDesignation: string;
  adminMobileNumber: string;
  adminWhatsAppNumber: string;
  adminEmailAddress: string;
  adminPassword: string;
  adminConfirmPassword: string;
  // Logo
  clinicLogo: File | null;
  clinicLogoPreview: string;
}

export interface PackageSelectionData {
  selectedPlanId: string;
  couponCode: string;
  referralCode: string;
  paymentMethod: string;
  skipPackage: boolean;
}

export interface OnboardingState {
  // Current step
  currentStep: number;
  maxStep: number;

  // Form data
  basicInfo: BasicInfoData;
  packageSelection: PackageSelectionData;

  // Session
  sessionId: string | null;
  isSubmitting: boolean;
  submitError: string | null;

  // Auto-save
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;

  // Actions
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setBasicInfo: (data: Partial<BasicInfoData>) => void;
  setPackageSelection: (data: Partial<PackageSelectionData>) => void;
  setSessionId: (id: string) => void;
  setSubmitting: (loading: boolean) => void;
  setSubmitError: (error: string | null) => void;
  setLastSaved: (date: Date) => void;
  setHasUnsavedChanges: (has: boolean) => void;
  resetOnboarding: () => void;
}

const initialBasicInfo: BasicInfoData = {
  clinicName: "",
  clinicType: "",
  registrationNumber: "",
  panVatNumber: "",
  country: "Nepal",
  stateProvince: "",
  city: "",
  fullAddress: "",
  googleMapLocation: "",
  adminFullName: "",
  adminDesignation: "",
  adminMobileNumber: "",
  adminWhatsAppNumber: "",
  adminEmailAddress: "",
  adminPassword: "",
  adminConfirmPassword: "",
  clinicLogo: null,
  clinicLogoPreview: "",
};

const initialPackageSelection: PackageSelectionData = {
  selectedPlanId: "free_trial",
  couponCode: "",
  referralCode: "",
  paymentMethod: "stripe",
  skipPackage: false,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
        currentStep: 1,
        maxStep: 3,
        basicInfo: initialBasicInfo,
        packageSelection: initialPackageSelection,
        sessionId: null,
        isSubmitting: false,
        submitError: null,
        lastSaved: null,
        hasUnsavedChanges: false,

        setCurrentStep: (step) => set({ currentStep: step }),
        nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, s.maxStep) })),
        prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 1) })),

        setBasicInfo: (data) =>
          set((s) => ({
            basicInfo: { ...s.basicInfo, ...data },
            hasUnsavedChanges: true,
          })),

        setPackageSelection: (data) =>
          set((s) => ({
            packageSelection: { ...s.packageSelection, ...data },
            hasUnsavedChanges: true,
          })),

        setSessionId: (id) => set({ sessionId: id }),
        setSubmitting: (loading) => set({ isSubmitting: loading }),
        setSubmitError: (error) => set({ submitError: error }),
        setLastSaved: (date) => set({ lastSaved: date, hasUnsavedChanges: false }),
        setHasUnsavedChanges: (has) => set({ hasUnsavedChanges: has }),

        resetOnboarding: () =>
          set({
            currentStep: 1,
            basicInfo: initialBasicInfo,
            packageSelection: initialPackageSelection,
            sessionId: null,
            isSubmitting: false,
            submitError: null,
            lastSaved: null,
            hasUnsavedChanges: false,
          }),
      }),
      {
        name: "carelim-onboarding",
        partialize: (state) => ({
          basicInfo: state.basicInfo,
          packageSelection: state.packageSelection,
          currentStep: state.currentStep,
          sessionId: state.sessionId,
        }),
      }
    )
  );

// Auto-save is handled by the persist middleware (saves to localStorage automatically)
// This helper can be called to mark data as saved
export const markAsSaved = () => {
  useOnboardingStore.getState().setLastSaved(new Date());
};
