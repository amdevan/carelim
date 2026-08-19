// Carelim OS — Multi-Step Onboarding Page
// Orchestrates all 4 steps with progress indicator, navigation, and animations

"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/onboarding/step-indicator";
import { Step1BasicInfo } from "@/components/onboarding/step1-basic-info";
import { Step2Modules } from "@/components/onboarding/step2-modules";
import { Step3Pricing } from "@/components/onboarding/step3-pricing";
import { Step4Success } from "@/components/onboarding/step4-success";
import { useOnboardingStore } from "@/components/onboarding/onboarding-store";
import { apiUrl } from "@/lib/api";
import { toast } from "sonner";

export default function OnboardingPage() {
  const {
    currentStep,
    maxStep,
    basicInfo,
    moduleSelection,
    packageSelection,
    isSubmitting,
    submitError,
    nextStep,
    prevStep,
    setSubmitting,
    setSubmitError,
    setSessionId,
  } = useOnboardingStore();

  // Generate session ID on mount
  useEffect(() => {
    if (!useOnboardingStore.getState().sessionId) {
      const id = `onboarding_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      setSessionId(id);
    }
  }, [setSessionId]);

  // Auto-save to API on data changes
  useEffect(() => {
    const saveProgress = async () => {
      const session = useOnboardingStore.getState();
      if (!session.sessionId) return;

      try {
        await fetch(apiUrl("/api/onboarding"), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: session.sessionId,
            organizationData: session.basicInfo,
            selectedModules: session.moduleSelection.selectedModuleKeys,
            selectedPlan: session.packageSelection,
            currentStep: session.currentStep,
          }),
        });
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    };

    const timeout = setTimeout(saveProgress, 3000);
    return () => clearTimeout(timeout);
  }, [basicInfo, moduleSelection.selectedModuleKeys, packageSelection, currentStep]);

  // Validate step 1
  const validateStep1 = () => {
    const errors: string[] = [];
    if (!basicInfo.clinicName.trim()) errors.push("Clinic/Hospital name is required");
    if (!basicInfo.clinicType) errors.push("Clinic type is required");
    if (!basicInfo.adminFullName.trim()) errors.push("Administrator full name is required");
    if (!basicInfo.adminMobileNumber.trim()) errors.push("Mobile number is required");
    if (!basicInfo.adminEmailAddress.trim()) errors.push("Email address is required");
    if (!basicInfo.adminPassword) errors.push("Password is required");
    if (basicInfo.adminPassword !== basicInfo.adminConfirmPassword) {
      errors.push("Passwords do not match");
    }
    if (basicInfo.adminPassword.length < 8) {
      errors.push("Password must be at least 8 characters");
    }
    return errors;
  };

  // Validate step 2
  const validateStep2 = () => {
    if (moduleSelection.selectedModuleKeys.length === 0) {
      return ["Please select at least one module"];
    }
    return [];
  };

  const handleNext = () => {
    let errors: string[] = [];

    if (currentStep === 1) {
      errors = validateStep1();
    } else if (currentStep === 2) {
      errors = validateStep2();
    }

    if (errors.length > 0) {
      errors.forEach((err) => toast.error(err));
      return;
    }

    if (currentStep < maxStep) {
      nextStep();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      prevStep();
    }
  };

  const handleComplete = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(apiUrl("/api/onboarding"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          basicInfo,
          selectedModules: moduleSelection.selectedModuleKeys,
          selectedPlan: packageSelection.selectedPlanId,
          packageSelection,
          skipPackage: packageSelection.skipPackage,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create organization");
      }

      // Store the result for the success screen
      localStorage.setItem("carelim-onboarding-result", JSON.stringify(result));
      
      // Advance to success step
      nextStep();
      toast.success("Organization created successfully!");
    } catch (error: any) {
      setSubmitError(error.message || "An unexpected error occurred");
      toast.error(error.message || "Failed to create organization");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <Step1BasicInfo />;
      case 2:
        return <Step2Modules />;
      case 3:
        return <Step3Pricing />;
      case 4:
        return <Step4Success />;
      default:
        return <Step1BasicInfo />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <span className="text-2xl font-bold text-foreground">Carelim OS</span>
          </div>
        </motion.div>

        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} maxStep={maxStep} />

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
              {renderStepContent()}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons (Steps 1 & 2 only) */}
        {currentStep < maxStep - 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-between mt-6"
          >
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </Button>

            <Button
              onClick={handleNext}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        )}

        {/* Submit Button for Step 3 -> Step 4 */}
        {currentStep === maxStep - 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6"
          >
            <Button
              onClick={handleComplete}
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating your organization...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Complete Onboarding
                </>
              )}
            </Button>
            {submitError && (
              <p className="text-sm text-red-500 text-center mt-2">{submitError}</p>
            )}
          </motion.div>
        )}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8 text-sm text-muted-foreground"
        >
          <p>
            By continuing, you agree to Carelim OS{" "}
            <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>
            {" "} and {" "}
            <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
          </p>
          <p className="mt-2">
            © {new Date().getFullYear()} Carelim OS — Enterprise Healthcare Management Platform
          </p>
        </motion.div>
      </div>
    </div>
  );
}
