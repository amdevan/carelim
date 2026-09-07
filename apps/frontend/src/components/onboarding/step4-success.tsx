"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CheckCircle, Copy, ExternalLink, Download, Check, Sparkles,
  ArrowRight, ShieldCheck, CreditCard, Building2, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useOnboardingStore } from "./onboarding-store";
import { PRICING_PLANS } from "./pricing-data";

export function Step4Success() {
  const { basicInfo, packageSelection, resetOnboarding } = useOnboardingStore();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const selectedPlan =
    PRICING_PLANS.find((p) => p.id === packageSelection.selectedPlanId) ||
    PRICING_PLANS[0];

  const trialExpiry = new Date();
  trialExpiry.setDate(trialExpiry.getDate() + 14);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(basicInfo.adminEmailAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoToDashboard = () => {
    resetOnboarding();
    router.push("/");
  };

  const handleDownloadApp = () => {
    resetOnboarding();
    window.open("https://play.google.com/store/apps/details?id=com.carelim", "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Big Success Header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="text-center py-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 12 }}
          className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full mb-4"
        >
          <CheckCircle className="w-10 h-10 text-green-500" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-foreground mb-1"
        >
          Organization Created Successfully!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground text-base"
        >
          Your clinic workspace is ready. Login with your email to get started.
        </motion.p>
      </motion.div>

      {/* Login Credentials - Prominent */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="py-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-green-700 dark:text-green-400 uppercase tracking-wide">Your Login Email</p>
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-foreground">{basicInfo.adminEmailAddress}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyEmail}
                  className="gap-1.5 shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Use the password you set during registration</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Summary Grid */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Building2 className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Organization</p>
              <p className="text-sm font-semibold">{basicInfo.clinicName}</p>
              <p className="text-xs text-muted-foreground">{basicInfo.clinicType}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <ShieldCheck className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Administrator</p>
              <p className="text-sm font-semibold">{basicInfo.adminFullName}</p>
              <p className="text-xs text-muted-foreground">Super Admin</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <CreditCard className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="text-sm font-semibold">{selectedPlan.label}</p>
              <p className="text-xs text-muted-foreground">
                {selectedPlan.id === "free_trial" ? "Free trial" : `NPR ${selectedPlan.price.toLocaleString()}/mo`}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Clock className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Trial Expires</p>
              <p className="text-sm font-semibold">{formatDate(trialExpiry)}</p>
              <p className="text-xs text-muted-foreground">14 days from today</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="space-y-3"
      >
        <Button
          size="lg"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 h-12"
          onClick={handleGoToDashboard}
        >
          Go to Login
          <ArrowRight className="w-4 h-4" />
        </Button>

        <div className="grid grid-cols-2 gap-3">
          <Button
            size="default"
            variant="outline"
            className="gap-2"
            onClick={handleDownloadApp}
          >
            <Download className="w-4 h-4" />
            Download App
          </Button>
          <Button
            size="default"
            variant="outline"
            className="gap-2"
            onClick={handleGoToDashboard}
          >
            <ExternalLink className="w-4 h-4" />
            Open Dashboard
          </Button>
        </div>
      </motion.div>

      {/* Footer note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-center text-xs text-muted-foreground"
      >
        A confirmation email has been sent to{" "}
        <span className="font-medium text-foreground">{basicInfo.adminEmailAddress}</span>.
        Login with your email and password to access your workspace.
      </motion.p>

      {/* Sparkle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="flex justify-center"
      >
        <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
      </motion.div>
    </div>
  );
}
