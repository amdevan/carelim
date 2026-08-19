// Carelim OS — Onboarding State Management
// Zustand store with auto-save to localStorage

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getModulesByCategory } from "./module-data";

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

export interface ModuleSelectionData {
  selectedModuleKeys: string[];
  recommendedModuleKeys: string[];
  searchQuery: string;
  activeCategory: string;
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
  moduleSelection: ModuleSelectionData;
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
  setModuleSelection: (data: Partial<ModuleSelectionData>) => void;
  setPackageSelection: (data: Partial<PackageSelectionData>) => void;
  toggleModule: (moduleKey: string) => void;
  selectAllModules: (category: string) => void;
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

const initialModuleSelection: ModuleSelectionData = {
  selectedModuleKeys: [],
  recommendedModuleKeys: [],
  searchQuery: "",
  activeCategory: "all",
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
        maxStep: 4,
        basicInfo: initialBasicInfo,
        moduleSelection: initialModuleSelection,
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

        setModuleSelection: (data) =>
          set((s) => ({
            moduleSelection: { ...s.moduleSelection, ...data },
            hasUnsavedChanges: true,
          })),

        setPackageSelection: (data) =>
          set((s) => ({
            packageSelection: { ...s.packageSelection, ...data },
            hasUnsavedChanges: true,
          })),

        toggleModule: (moduleKey) =>
          set((s) => {
            const isSelected = s.moduleSelection.selectedModuleKeys.includes(moduleKey);
            const selectedModuleKeys = isSelected
              ? s.moduleSelection.selectedModuleKeys.filter((k) => k !== moduleKey)
              : [...s.moduleSelection.selectedModuleKeys, moduleKey];
            return {
              moduleSelection: { ...s.moduleSelection, selectedModuleKeys },
              hasUnsavedChanges: true,
            };
          }),

        selectAllModules: (category) =>
          set((s) => {
            const modules = getModulesByCategory(category);
            const moduleKeys = modules.map((m) => m.key);
            return {
              moduleSelection: { ...s.moduleSelection, selectedModuleKeys: moduleKeys },
              hasUnsavedChanges: true,
            };
          }),

        setSessionId: (id) => set({ sessionId: id }),
        setSubmitting: (loading) => set({ isSubmitting: loading }),
        setSubmitError: (error) => set({ submitError: error }),
        setLastSaved: (date) => set({ lastSaved: date, hasUnsavedChanges: false }),
        setHasUnsavedChanges: (has) => set({ hasUnsavedChanges: has }),

        resetOnboarding: () =>
          set({
            currentStep: 1,
            basicInfo: initialBasicInfo,
            moduleSelection: initialModuleSelection,
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
          moduleSelection: {
            selectedModuleKeys: state.moduleSelection.selectedModuleKeys,
            recommendedModuleKeys: state.moduleSelection.recommendedModuleKeys,
          },
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
