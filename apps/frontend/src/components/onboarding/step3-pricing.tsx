// Carelim OS — Step 3: Package Selection
// Pricing cards, coupon/referral codes, payment methods, skip option

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tag, CreditCard, Gift, Info, Check, Star,
  Award, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
      // Simulate coupon validation
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
      // Simulate referral validation
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
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Choose Your Subscription
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Start free or upgrade anytime. All plans include our 14-day money-back guarantee.
          </p>
        </motion.div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        <AnimatePresence>
          {PRICING_PLANS.map((plan, index) => {
            const isSelected = selectedPlanId === plan.id;
            const isPopular = plan.popular;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                {isPopular && (
                  <motion.div
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                    className="absolute -top-3 left-1/2 -translate-x-1/2 z-20"
                  >
                    <div className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full shadow-lg">
                      <Star className="w-3 h-3 fill-current" />
                      {plan.highlightLabel}
                    </div>
                  </motion.div>
                )}

                <Card
                  className={cn(
                    "cursor-pointer transition-all duration-300 h-full",
                    "border-2",
                    isSelected
                      ? "border-blue-600 shadow-lg shadow-blue-600/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300",
                    isPopular && !isSelected && "border-blue-200 dark:border-blue-800",
                  )}
                  onClick={() => handlePlanSelect(plan.id)}
                >
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-lg font-semibold text-muted-foreground">
                      {plan.name}
                    </CardTitle>
                    <div className="mt-3">
                      <span className="text-4xl font-bold text-foreground">
                        {plan.customPrice ? "Custom" : formatPrice(plan.price, plan.currency)}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-sm text-muted-foreground">/{plan.duration}</span>
                      )}
                    </div>
                    {plan.subtitle && (
                      <CardDescription className="mt-2 text-sm">
                        {plan.subtitle}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      {plan.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          {feature.included ? (
                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <X className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                          )}
                          <span
                            className={cn(
                              "text-sm",
                              feature.included
                                ? "text-foreground"
                                : "text-muted-foreground line-through"
                            )}
                          >
                            {feature.text}
                          </span>
                        </div>
                      ))}
                    </div>

                    <Button
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "w-full mt-4",
                        isSelected
                          ? "bg-blue-600 hover:bg-blue-700"
                          : "border-gray-300 hover:bg-gray-100"
                      )}
                      size="sm"
                    >
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-blue-600" />
              Have a Coupon or Referral Code?
            </CardTitle>
            <CardDescription>
              Apply your codes to get discounts and benefits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Coupon Code */}
            <div className="space-y-2">
              <Label htmlFor="couponCode" className="flex items-center gap-1">
                <Gift className="w-4 h-4" /> Coupon Code
              </Label>
              <div className="flex gap-2">
                <Input
                  id="couponCode"
                  value={couponCode}
                  onChange={(e) => setPackageSelection({ couponCode: e.target.value.toUpperCase() })}
                  placeholder="Enter coupon code (e.g., WELCOME10)"
                  className={cn(couponError && "border-red-500")}
                />
                <Button
                  variant="outline"
                  onClick={handleCouponApply}
                  disabled={!couponCode.trim() || couponApplied}
                  className="whitespace-nowrap"
                >
                  {couponApplied ? "Applied" : "Apply"}
                </Button>
              </div>
              {couponApplied && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-green-600 flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Coupon applied successfully!
                </motion.p>
              )}
              {couponError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {couponError}
                </p>
              )}
            </div>

            {/* Referral Code */}
            <div className="space-y-2">
              <Label htmlFor="referralCode" className="flex items-center gap-1">
                <Award className="w-4 h-4" /> Referral Code
              </Label>
              <div className="flex gap-2">
                <Input
                  id="referralCode"
                  value={referralCode}
                  onChange={(e) => setPackageSelection({ referralCode: e.target.value.toUpperCase() })}
                  placeholder="Enter referral code (e.g., REF123)"
                  className={cn(referralError && "border-red-500")}
                />
                <Button
                  variant="outline"
                  onClick={handleReferralApply}
                  disabled={!referralCode.trim() || referralApplied}
                  className="whitespace-nowrap"
                >
                  {referralApplied ? "Applied" : "Apply"}
                </Button>
              </div>
              {referralApplied && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-green-600 flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Referral code applied successfully!
                </motion.p>
              )}
              {referralError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {referralError}
                </p>
              )}
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Payment Methods
            </CardTitle>
            <CardDescription>
              Choose your preferred payment method
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {PAYMENT_METHODS.map((method) => (
                <motion.button
                  key={method.id}
                  type="button"
                  onClick={() => setPackageSelection({ paymentMethod: method.id })}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all duration-200",
                    paymentMethod === method.id
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-2xl">{method.icon}</span>
                  <span className="text-xs font-medium">{method.name}</span>
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
        className="text-center"
      >
        <Button
          variant="ghost"
          onClick={handleSkip}
          className="text-muted-foreground hover:text-foreground"
        >
          Skip for now — Start 14-day free trial
        </Button>
      </motion.div>

      {/* Selected Plan Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="bg-gray-50 dark:bg-gray-800/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Selected Plan</p>
                <p className="font-semibold text-foreground">{selectedPlan.label}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  {selectedPlan.price > 0
                    ? `${formatPrice(selectedPlan.price, selectedPlan.currency)} / ${selectedPlan.duration}`
                    : "Free Trial — 14 days"}
                </p>
                {selectedPlan.popular && (
                  <Badge className="mt-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    Most Popular
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
