// Carelim OS — Pricing Plan Definitions for Onboarding

export interface PricingFeature {
  text: string;
  included: boolean;
}

export interface PricingPlan {
  id: string;
  name: string;
  label: string;
  subtitle: string;
  price: number;
  currency: string;
  billingCycle: string;
  duration: string;
  features: PricingFeature[];
  highlight?: boolean;
  highlightLabel?: string;
  buttonText: string;
  popular?: boolean;
  customPrice?: boolean;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free_trial",
    name: "FREE TRIAL",
    label: "Free Trial",
    subtitle: "14-day free trial — no credit card required",
    price: 0,
    currency: "NPR",
    billingCycle: "one-time",
    duration: "14 Days",
    features: [
      { text: "Unlimited Patients", included: true },
      { text: "Core Modules", included: true },
      { text: "2 Users", included: true },
      { text: "Basic Support", included: true },
      { text: "WhatsApp Reminders", included: false },
      { text: "AI Features", included: false },
      { text: "Priority Support", included: false },
    ],
    buttonText: "Start Free Trial",
  },
  {
    id: "starter",
    name: "STARTER PLAN",
    label: "Starter",
    subtitle: "Best for small clinics",
    price: 15000,
    currency: "NPR",
    billingCycle: "monthly",
    duration: "per month",
    features: [
      { text: "Everything in Free", included: true },
      { text: "5 Users", included: true },
      { text: "WhatsApp Reminder", included: true },
      { text: "Online Appointment", included: true },
      { text: "Email Support", included: true },
      { text: "Inventory", included: false },
      { text: "AI Features", included: false },
    ],
    buttonText: "Get Started",
  },
  {
    id: "professional",
    name: "PROFESSIONAL PLAN",
    label: "Professional",
    subtitle: "Most popular for growing practices",
    price: 35000,
    currency: "NPR",
    billingCycle: "monthly",
    duration: "per month",
    features: [
      { text: "Unlimited Users", included: true },
      { text: "Inventory", included: true },
      { text: "Accounts", included: true },
      { text: "Lab", included: true },
      { text: "Pharmacy", included: true },
      { text: "AI Features", included: true },
      { text: "Priority Support", included: true },
    ],
    highlight: true,
    highlightLabel: "Most Popular",
    popular: true,
    buttonText: "Get Started",
  },
  {
    id: "enterprise",
    name: "ENTERPRISE PLAN",
    label: "Enterprise",
    subtitle: "Custom solutions for large organizations",
    price: 0,
    currency: "NPR",
    billingCycle: "custom",
    duration: "custom pricing",
    features: [
      { text: "Unlimited Everything", included: true },
      { text: "Dedicated Server", included: true },
      { text: "White Label", included: true },
      { text: "API Access", included: true },
      { text: "Training", included: true },
      { text: "Dedicated Account Manager", included: true },
      { text: "Custom Development", included: true },
    ],
    buttonText: "Contact Sales",
  },
];

// Payment methods available
export const PAYMENT_METHODS = [
  { id: "stripe", name: "Stripe", icon: "💳" },
  { id: "khalti", name: "Khalti", icon: "📱" },
  { id: "esewa", name: "eSewa", icon: "💰" },
  { id: "bank-transfer", name: "Bank Transfer", icon: "🏦" },
  { id: "cash", name: "Cash", icon: "💵" },
  { id: "pay-later", name: "Pay Later", icon: "📅" },
];

// Format price for display
export function formatPrice(price: number, currency: string = "NPR"): string {
  if (price === 0) return "Free";
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}
