// Carelim OS — Step 3: Package Selection
// Pricing cards, coupon/referral codes, payment methods, skip option

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tag, CreditCard, Gift, Check, Star,
  Award, X, Zap, Shield, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useOnboardingStore } from "./onboarding-store";
import { PRICING_PLANS, PAYMENT_METHODS, formatPrice } from "./pricing-data";
import { markAsSaved } from "./onboarding-store";

export function Step3Pricing() {
  const { packageSelection, setPackageSelection } = useOnboardingStore();
  const { selectedPlanId, couponCode, referralCode, paymentMethod, skipPackage } = packageSelection;

  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [referralApplied, setReferralApplied] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);

  // Auto-save
  useEffect(() => {
    markAsSaved();
  }, [selectedPlanId, couponCode, referralCode, paymentMethod, skipPackage]);

  const handlePlanSelect = (planId: string) => {
    setPackageSelection({ selectedPlanId: planId, skipPackage: false });
  };

  const handleSkip = () => {
    setPackageSelection({ skipPackage: true, selectedPlanId: "free_trial" });
  };

  const handleCouponApply = () => {
    if (couponCode.trim()) {
      if (couponCode.toUpperCase() === "WELCOME10") {
        setCouponApplied(true);
        setCouponError(null);
      } else if (couponCode.toUpperCase() === "SAVE20") {
        setCouponApplied(true);
        setCouponError(null);
      } else {
        setCouponApplied(false);
        setCouponError("Invalid coupon code. Try WELCOME10 or SAVE20.");
      }
    }
  };

  const handleReferralApply = () => {
    if (referralCode.trim()) {
      if (referralCode.toUpperCase().startsWith("REF")) {
        setReferralApplied(true);
        setReferralError(null);
      } else {
        setReferralApplied(false);
        setReferralError("Invalid referral code.");
      }
    }
  };

  const selectedPlan = PRICING_PLANS.find((p) => p.id === selectedPlanId) || PRICING_PLANS[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Simple, transparent pricing
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Choose Your Plan
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
            Start free for 14 days, no credit card required. Upgrade or cancel anytime.
          </p>
        </motion.div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
        <AnimatePresence>
          {PRICING_PLANS.map((plan, index) => {
            const isSelected = selectedPlanId === plan.id;
            const isPopular = plan.popular;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.4 }}
                className="relative"
              >
                {/* Popular Badge */}
                {isPopular && (
                  <motion.div
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20"
                  >
                    <div className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold rounded-full shadow-lg shadow-blue-500/30">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {plan.highlightLabel}
                    </div>
                  </motion.div>
                )}

                <Card
                  className={cn(
                    "relative overflow-hidden transition-all duration-300 h-full",
                    "border-2 rounded-2xl",
                    isSelected
                      ? "border-blue-600 shadow-xl shadow-blue-600/15 scale-[1.02]"
                      : "border-gray-200/80 dark:border-gray-700/80 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg",
                    isPopular && !isSelected && "border-blue-200 dark:border-blue-800/60",
                    isPopular && "ring-1 ring-blue-100 dark:ring-blue-900/50",
                  )}
                  onClick={() => handlePlanSelect(plan.id)}
                >
                  {/* Popular plan gradient top accent */}
                  {isPopular && (
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                  )}

                  <CardHeader className="text-center pt-7 pb-5 px-5">
                    <CardTitle className={cn(
                      "text-sm font-semibold tracking-wider uppercase",
                      isPopular ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"
                    )}>
                      {plan.name}
                    </CardTitle>

                    <div className="mt-4 mb-1">
                      {plan.customPrice ? (
                        <span className="text-4xl font-extrabold text-foreground">
                          Custom
                        </span>
                      ) : (
                        <div className="flex items-baseline justify-center gap-0.5">
                          {plan.price > 0 && (
                            <span className="text-lg font-semibold text-muted-foreground">
                              {plan.currency}
                            </span>
                          )}
                          <span className="text-4xl font-extrabold text-foreground tracking-tight">
                            {plan.price > 0 ? plan.price.toLocaleString() : "Free"}
                          </span>
                        </div>
                      )}
                      {plan.price > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          / {plan.duration}
                        </p>
                      )}
                      {plan.price === 0 && plan.id === "free_trial" && (
                        <p className="text-sm text-muted-foreground mt-1">
                          for 14 days
                        </p>
                      )}
                    </div>

                    {plan.subtitle && (
                      <CardDescription className="text-sm leading-relaxed">
                        {plan.subtitle}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="px-5 pb-6 space-y-5">
                    {/* Divider */}
                    <div className="h-px bg-gray-100 dark:bg-gray-800" />

                    {/* Features */}
                    <ul className="space-y-2.5">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          {feature.included ? (
                            <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                              <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                            </div>
                          ) : (
                            <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                              <X className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                            </div>
                          )}
                          <span
                            className={cn(
                              "text-sm leading-snug",
                              feature.included
                                ? "text-foreground font-medium"
                                : "text-muted-foreground"
                            )}
                          >
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <Button
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "w-full h-11 rounded-xl font-semibold text-sm transition-all duration-200",
                        isSelected && isPopular
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/25"
                          : isSelected
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : isPopular
                              ? "border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                              : ""
                      )}
                    >
                      {isSelected && (
                        <Check className="w-4 h-4 mr-1.5" />
                      )}
                      {plan.buttonText}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Coupon & Referral Codes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="rounded-2xl border-gray-200/80 dark:border-gray-700/80">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Tag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              Have a Code?
            </CardTitle>
            <CardDescription className="text-sm">
              Apply coupon or referral codes for extra savings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Coupon Code */}
              <div className="space-y-2">
                <Label htmlFor="couponCode" className="flex items-center gap-1.5 text-sm font-medium">
                  <Gift className="w-3.5 h-3.5 text-green-500" /> Coupon Code
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="couponCode"
                    value={couponCode}
                    onChange={(e) => setPackageSelection({ couponCode: e.target.value.toUpperCase() })}
                    placeholder="e.g., WELCOME10"
                    className={cn(
                      "rounded-xl h-10",
                      couponError && "border-red-500 focus-visible:ring-red-500",
                      couponApplied && "border-green-500 focus-visible:ring-green-500"
                    )}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCouponApply}
                    disabled={!couponCode.trim() || couponApplied}
                    className={cn(
                      "rounded-xl h-10 px-4 font-medium",
                      couponApplied && "bg-green-50 dark:bg-green-950/30 text-green-600 border-green-200 dark:border-green-800"
                    )}
                  >
                    {couponApplied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      "Apply"
                    )}
                  </Button>
                </div>
                {couponApplied && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-green-600 font-medium"
                  >
                    Coupon applied successfully!
                  </motion.p>
                )}
                {couponError && (
                  <p className="text-xs text-red-500">{couponError}</p>
                )}
              </div>

              {/* Referral Code */}
              <div className="space-y-2">
                <Label htmlFor="referralCode" className="flex items-center gap-1.5 text-sm font-medium">
                  <Award className="w-3.5 h-3.5 text-amber-500" /> Referral Code
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="referralCode"
                    value={referralCode}
                    onChange={(e) => setPackageSelection({ referralCode: e.target.value.toUpperCase() })}
                    placeholder="e.g., REF123"
                    className={cn(
                      "rounded-xl h-10",
                      referralError && "border-red-500 focus-visible:ring-red-500",
                      referralApplied && "border-green-500 focus-visible:ring-green-500"
                    )}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReferralApply}
                    disabled={!referralCode.trim() || referralApplied}
                    className={cn(
                      "rounded-xl h-10 px-4 font-medium",
                      referralApplied && "bg-green-50 dark:bg-green-950/30 text-green-600 border-green-200 dark:border-green-800"
                    )}
                  >
                    {referralApplied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      "Apply"
                    )}
                  </Button>
                </div>
                {referralApplied && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-green-600 font-medium"
                  >
                    Referral applied successfully!
                  </motion.p>
                )}
                {referralError && (
                  <p className="text-xs text-red-500">{referralError}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Payment Methods */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="rounded-2xl border-gray-200/80 dark:border-gray-700/80">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              Payment Method
            </CardTitle>
            <CardDescription className="text-sm">
              Choose how you'd like to pay
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {PAYMENT_METHODS.map((method) => (
                <motion.button
                  key={method.id}
                  type="button"
                  onClick={() => setPackageSelection({ paymentMethod: method.id })}
                  className={cn(
                    "flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all duration-200",
                    paymentMethod === method.id
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30 shadow-sm"
                      : "border-gray-200/80 dark:border-gray-700/80 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  )}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="text-2xl">{method.icon}</span>
                  <span className={cn(
                    "text-xs font-medium leading-tight text-center",
                    paymentMethod === method.id
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-muted-foreground"
                  )}>
                    {method.name}
                  </span>
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Skip Option */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-center pt-2"
      >
        <Button
          variant="ghost"
          onClick={handleSkip}
          className="text-muted-foreground hover:text-foreground gap-2 h-11 px-6"
        >
          <Zap className="w-4 h-4" />
          Skip for now — Start 14-day free trial
        </Button>
      </motion.div>

      {/* Selected Plan Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="rounded-2xl border-gray-200/80 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-800/30">
          <CardContent className="pt-5 pb-5 px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Selected Plan</p>
                  <p className="font-bold text-foreground text-lg">{selectedPlan.label}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-foreground text-lg">
                  {selectedPlan.customPrice
                    ? "Custom"
                    : selectedPlan.price > 0
                      ? `${formatPrice(selectedPlan.price, selectedPlan.currency)}`
                      : "Free"
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedPlan.price > 0
                    ? `/ ${selectedPlan.duration}`
                    : "14-day trial"
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
