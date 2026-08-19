// Carelim OS — Step 4: Success Screen
// Beautiful success animation, summary, onboarding checklist, action buttons

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle, Copy, ExternalLink, Users, Calendar,
  FileText, Camera, BarChart3, Settings, Share2,
  PlayCircle, Download, Check, Sparkles, Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOnboardingStore } from "./onboarding-store";
import { MODULES } from "./module-data";
import { PRICING_PLANS } from "./pricing-data";

interface OnboardingChecklistItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  completed: boolean;
}

export function Step4Success() {
  const { basicInfo, moduleSelection, packageSelection } = useOnboardingStore();
  const [copied, setCopied] = useState(false);
  const [checklist, setChecklist] = useState<OnboardingChecklistItem[]>([
    { id: "logo", label: "Upload Clinic Logo", icon: Camera, completed: !!basicInfo.clinicLogoPreview },
    { id: "doctors", label: "Add Doctors", icon: Users, completed: false },
    { id: "departments", label: "Add Departments", icon: Settings, completed: false },
    { id: "billing", label: "Configure Billing", icon: BarChart3, completed: false },
    { id: "staff", label: "Add Staff", icon: Users, completed: false },
    { id: "patient", label: "Add First Patient", icon: Users, completed: false },
    { id: "appointment", label: "Book First Appointment", icon: Calendar, completed: false },
    { id: "whatsapp", label: "Configure WhatsApp", icon: Share2, completed: false },
    { id: "sms", label: "Enable SMS", icon: Send, completed: false },
    { id: "profile", label: "Complete Profile", icon: Settings, completed: false },
  ]);

  const selectedModules = MODULES.filter((m) =>
    moduleSelection.selectedModuleKeys.includes(m.key)
  );

  const selectedPlan =
    PRICING_PLANS.find((p) => p.id === packageSelection.selectedPlanId) ||
    PRICING_PLANS[0];

  // Calculate trial expiry date
  const trialExpiry = new Date();
  trialExpiry.setDate(trialExpiry.getDate() + 14);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleCopyUrl = () => {
    const url = `${basicInfo.clinicName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.carelim.com`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChecklistToggle = (id: string) => {
    setChecklist(
      checklist.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const completedCount = checklist.filter((item) => item.completed).length;
  const progressPercent = Math.round((completedCount / checklist.length) * 100);

  return (
    <div className="space-y-8">
      {/* Success Animation */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 15 }}
          className="inline-flex items-center justify-center w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full mb-4"
        >
          <CheckCircle className="w-12 h-12 text-green-500" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-4xl font-bold text-foreground mb-2"
        >
          Welcome to Carelim OS 🎉
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-muted-foreground text-lg max-w-2xl mx-auto"
        >
          Your organization has been created successfully.
        </motion.p>

        {/* Confetti effect */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="absolute inset-0 pointer-events-none overflow-hidden"
        >
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-blue-400 rounded-full"
              initial={{
                x: "50%",
                y: "50%",
                scale: 0,
                opacity: 1,
              }}
              animate={{
                x: `${50 + (Math.random() - 0.5) * 100}%`,
                y: `${50 + (Math.random() - 0.5) * 100}%`,
                scale: [0, 1, 0],
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: 2,
                delay: 0.5 + i * 0.05,
                ease: "easeOut",
              }}
            />
          ))}
        </motion.div>
      </motion.div>

      {/* Organization Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Organization Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Organization Name</p>
                  <p className="font-semibold text-foreground">{basicInfo.clinicName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Clinic Type</p>
                  <p className="font-semibold text-foreground">{basicInfo.clinicType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Administrator</p>
                  <p className="font-semibold text-foreground">{basicInfo.adminFullName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-semibold text-foreground">{basicInfo.adminEmailAddress}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-semibold text-foreground">{basicInfo.adminMobileNumber}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Selected Modules</p>
                  <p className="font-semibold text-foreground">
                    {selectedModules.length} modules
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedModules.slice(0, 5).map((mod) => (
                      <Badge key={mod.key} variant="secondary" className="text-xs">
                        {mod.name}
                      </Badge>
                    ))}
                    {selectedModules.length > 5 && (
                      <Badge variant="secondary" className="text-xs">
                        +{selectedModules.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Selected Package</p>
                  <p className="font-semibold text-foreground">{selectedPlan.label}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Trial Expiry Date</p>
                  <p className="font-semibold text-foreground">{formatDate(trialExpiry)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Clinic URL</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {basicInfo.clinicName
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-+|-+$/g, "") || "clinic"}.carelim.com
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyUrl}
                      className="h-6 px-2"
                    >
                      {copied ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
            <ExternalLink className="w-4 h-4 mr-2" />
            Go to Dashboard
          </Button>
          <Button size="lg" variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Complete Clinic Profile
          </Button>
          <Button size="lg" variant="outline">
            <Users className="w-4 h-4 mr-2" />
            Invite Staff
          </Button>
          <Button size="lg" variant="outline">
            <PlayCircle className="w-4 h-4 mr-2" />
            Watch Tutorial
          </Button>
          <Button size="lg" variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download Mobile App
          </Button>
          <Button size="lg" variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Book Free Demo
          </Button>
        </div>
      </motion.div>

      {/* Onboarding Checklist */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                Onboarding Checklist
              </span>
              <Badge
                className={cn(
                  "text-sm",
                  progressPercent === 100
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                )}
              >
                {progressPercent}% Complete
              </Badge>
            </CardTitle>
            <CardDescription>
              Complete these steps to get the most out of Carelim OS
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {checklist.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + index * 0.05 }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all duration-200",
                    item.completed
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                      : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleChecklistToggle(item.id)}
                    className={cn(
                      "flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all",
                      item.completed
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-gray-400 dark:border-gray-500"
                    )}
                  >
                    {item.completed && <Check className="w-3 h-3" />}
                  </button>
                  <item.icon
                    className={cn(
                      "w-4 h-4",
                      item.completed
                        ? "text-green-500"
                        : "text-muted-foreground"
                    )}
                  />
                  <span
                    className={cn(
                      "text-sm flex-1",
                      item.completed
                        ? "text-green-700 dark:text-green-400 line-through"
                        : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                  {item.completed && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-300"
                    >
                      Done
                    </Badge>
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Sparkle animation at the end */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="flex justify-center"
      >
        <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
      </motion.div>
    </div>
  );
}
