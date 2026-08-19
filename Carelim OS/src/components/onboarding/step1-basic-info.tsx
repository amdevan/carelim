// Carelim OS — Step 1: Basic Information
// Organization details, administrator info, logo upload, validation

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Eye, EyeOff, Upload, X, AlertCircle,
  Building, FileText, Hash, MapPin, Globe, Phone,
  Mail, Lock, User, Briefcase, MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useOnboardingStore } from "./onboarding-store";
import { markAsSaved } from "./onboarding-store";

// Clinic type options
const CLINIC_TYPES = [
  "Clinic",
  "Hospital",
  "IVF & Fertility Center",
  "Dental Clinic",
  "Eye Hospital",
  "Laboratory",
  "Diagnostic Center",
  "Physiotherapy",
  "Mental Health Clinic",
  "Pharmacy",
  "Veterinary",
  "Home Healthcare",
  "Other",
];

// Country options (common healthcare markets)
const COUNTRIES = [
  "Nepal", "India", "United States", "United Kingdom",
  "Canada", "Australia", "Germany", "France",
  "Japan", "Singapore", "Malaysia", "UAE", "Saudi Arabia",
  "Kenya", "South Africa", "Brazil", "Mexico", "Other",
];

// Password strength levels
type PasswordStrength = "none" | "weak" | "fair" | "good" | "strong";

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return "none";
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return "weak";
  if (score === 2) return "fair";
  if (score === 3) return "good";
  return "strong";
}

function getStrengthText(strength: PasswordStrength): string {
  switch (strength) {
    case "weak": return "Weak password";
    case "fair": return "Fair password";
    case "good": return "Good password";
    case "strong": return "Strong password";
    default: return "";
  }
}

// Validation helpers
interface ValidationError {
  field: string;
  message: string;
}

export function Step1BasicInfo() {
  const { basicInfo, setBasicInfo } = useOnboardingStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors] = useState<ValidationError[]>([]);

  // Auto-save: mark as saved when basicInfo changes
  useEffect(() => {
    const timeout = setTimeout(() => markAsSaved(), 2000);
    return () => clearTimeout(timeout);
  }, [basicInfo]);

  const passwordStrength = getPasswordStrength(basicInfo.adminPassword);

  const getError = (field: string) => errors.find((e) => e.field === field)?.message;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        setBasicInfo({ clinicLogo: file, clinicLogoPreview: preview });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setBasicInfo({ clinicLogo: null, clinicLogoPreview: "" });
  };

  const handleInputChange = (field: string, value: string | File | null) => {
    setBasicInfo({ [field]: value } as any);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome to Carelim OS
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Create your healthcare organization in just a few minutes.
          </p>
        </motion.div>
      </div>

      {/* Organization Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-600" />
              Organization Information
            </CardTitle>
            <CardDescription>
              Enter your clinic or hospital details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Logo Upload */}
            <div className="flex items-start gap-6">
              <div className="flex flex-col items-center gap-2">
                {basicInfo.clinicLogoPreview ? (
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                    <img
                      src={basicInfo.clinicLogoPreview}
                      alt="Clinic Logo"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
                    <Upload className="w-6 h-6 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                )}
                <span className="text-xs text-muted-foreground">Clinic Logo (Optional)</span>
              </div>

              <div className="flex-1 space-y-4">
                {/* Clinic Name */}
                <div>
                  <Label htmlFor="clinicName" className="flex items-center gap-1">
                    Clinic/Hospital Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="clinicName"
                    value={basicInfo.clinicName}
                    onChange={(e) => handleInputChange("clinicName", e.target.value)}
                    placeholder="Enter clinic or hospital name"
                    className={cn(getError("clinicName") && "border-red-500")}
                  />
                  {getError("clinicName") && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {getError("clinicName")}
                    </p>
                  )}
                </div>

                {/* Clinic Type */}
                <div>
                  <Label htmlFor="clinicType" className="flex items-center gap-1">
                    Clinic Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={basicInfo.clinicType}
                    onValueChange={(val) => handleInputChange("clinicType", val)}
                  >
                    <SelectTrigger
                      id="clinicType"
                      className={cn(getError("clinicType") && "border-red-500")}
                    >
                      <SelectValue placeholder="Select clinic type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLINIC_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {getError("clinicType") && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {getError("clinicType")}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Registration & PAN/VAT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="registrationNumber" className="flex items-center gap-1">
                  <Hash className="w-4 h-4" /> Registration Number
                </Label>
                <Input
                  id="registrationNumber"
                  value={basicInfo.registrationNumber}
                  onChange={(e) => handleInputChange("registrationNumber", e.target.value)}
                  placeholder="e.g., REG-12345"
                />
              </div>
              <div>
                <Label htmlFor="panVatNumber" className="flex items-center gap-1">
                  <FileText className="w-4 h-4" /> PAN/VAT Number
                </Label>
                <Input
                  id="panVatNumber"
                  value={basicInfo.panVatNumber}
                  onChange={(e) => handleInputChange("panVatNumber", e.target.value)}
                  placeholder="e.g., PAN-XXXXX"
                />
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="country" className="flex items-center gap-1">
                  <Globe className="w-4 h-4" /> Country
                </Label>
                <Select
                  value={basicInfo.country}
                  onValueChange={(val) => handleInputChange("country", val)}
                >
                  <SelectTrigger id="country">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="stateProvince" className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" /> State/Province
                </Label>
                <Input
                  id="stateProvince"
                  value={basicInfo.stateProvince}
                  onChange={(e) => handleInputChange("stateProvince", e.target.value)}
                  placeholder="e.g., Bagmati Pradesh"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city" className="flex items-center gap-1">
                  City
                </Label>
                <Input
                  id="city"
                  value={basicInfo.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  placeholder="e.g., Kathmandu"
                />
              </div>
              <div>
                <Label htmlFor="fullAddress" className="flex items-center gap-1">
                  Full Address
                </Label>
                <Textarea
                  id="fullAddress"
                  value={basicInfo.fullAddress}
                  onChange={(e) => handleInputChange("fullAddress", e.target.value)}
                  placeholder="Enter complete address"
                  rows={2}
                />
              </div>
            </div>

            {/* Google Maps */}
            <div>
              <Label htmlFor="googleMapLocation" className="flex items-center gap-1">
                <Globe className="w-4 h-4" /> Google Map Location (Optional)
              </Label>
              <Input
                id="googleMapLocation"
                value={basicInfo.googleMapLocation}
                onChange={(e) => handleInputChange("googleMapLocation", e.target.value)}
                placeholder="Paste Google Maps link or embed URL"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Administrator Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Administrator Information
            </CardTitle>
            <CardDescription>
              Enter the super admin details for this organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name & Designation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="adminFullName" className="flex items-center gap-1">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="adminFullName"
                  value={basicInfo.adminFullName}
                  onChange={(e) => handleInputChange("adminFullName", e.target.value)}
                  placeholder="Dr. Jane Smith"
                  className={cn(getError("adminFullName") && "border-red-500")}
                />
                {getError("adminFullName") && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {getError("adminFullName")}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="adminDesignation" className="flex items-center gap-1">
                  <Briefcase className="w-4 h-4" /> Designation
                </Label>
                <Input
                  id="adminDesignation"
                  value={basicInfo.adminDesignation}
                  onChange={(e) => handleInputChange("adminDesignation", e.target.value)}
                  placeholder="e.g., Medical Director"
                />
              </div>
            </div>

            {/* Mobile & WhatsApp */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="adminMobileNumber" className="flex items-center gap-1">
                  <Phone className="w-4 h-4" /> Mobile Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="adminMobileNumber"
                  value={basicInfo.adminMobileNumber}
                  onChange={(e) => handleInputChange("adminMobileNumber", e.target.value)}
                  placeholder="+977 98XXXXXXXX"
                  className={cn(getError("adminMobileNumber") && "border-red-500")}
                />
                {getError("adminMobileNumber") && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {getError("adminMobileNumber")}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="adminWhatsAppNumber" className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" /> WhatsApp Number
                </Label>
                <Input
                  id="adminWhatsAppNumber"
                  value={basicInfo.adminWhatsAppNumber}
                  onChange={(e) => handleInputChange("adminWhatsAppNumber", e.target.value)}
                  placeholder="+977 98XXXXXXXX"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="adminEmailAddress" className="flex items-center gap-1">
                <Mail className="w-4 h-4" /> Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="adminEmailAddress"
                type="email"
                value={basicInfo.adminEmailAddress}
                onChange={(e) => handleInputChange("adminEmailAddress", e.target.value)}
                placeholder="admin@clinic.com"
                className={cn(getError("adminEmailAddress") && "border-red-500")}
              />
              {getError("adminEmailAddress") && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {getError("adminEmailAddress")}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="adminPassword" className="flex items-center gap-1">
                <Lock className="w-4 h-4" /> Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="adminPassword"
                  type={showPassword ? "text" : "password"}
                  value={basicInfo.adminPassword}
                  onChange={(e) => handleInputChange("adminPassword", e.target.value)}
                  placeholder="Enter a strong password"
                  className={cn(getError("adminPassword") && "border-red-500", "pr-10")}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {getError("adminPassword") && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {getError("adminPassword")}
                </p>
              )}

              {/* Password Strength Indicator */}
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {getStrengthText(passwordStrength)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {basicInfo.adminPassword.length}/8+ characters
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-300",
                      passwordStrength === "none" && "w-0",
                      passwordStrength === "weak" && "w-1/4 bg-red-500",
                      passwordStrength === "fair" && "w-1/2 bg-orange-500",
                      passwordStrength === "good" && "w-3/4 bg-blue-500",
                      passwordStrength === "strong" && "w-full bg-green-500",
                    )}
                  />
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className={cn(basicInfo.adminPassword.length >= 8 && "text-green-500")}>
                    8+ characters
                  </span>
                  <span className={cn(/[A-Z]/.test(basicInfo.adminPassword) && "text-green-500")}>
                    Uppercase letter
                  </span>
                  <span className={cn(/[0-9]/.test(basicInfo.adminPassword) && "text-green-500")}>
                    Number
                  </span>
                  <span className={cn(/[^A-Za-z0-9]/.test(basicInfo.adminPassword) && "text-green-500")}>
                    Special character
                  </span>
                </div>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <Label htmlFor="adminConfirmPassword" className="flex items-center gap-1">
                <Lock className="w-4 h-4" /> Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="adminConfirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={basicInfo.adminConfirmPassword}
                  onChange={(e) => handleInputChange("adminConfirmPassword", e.target.value)}
                  placeholder="Re-enter password"
                  className={cn(getError("adminConfirmPassword") && "border-red-500", "pr-10")}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {getError("adminConfirmPassword") && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {getError("adminConfirmPassword")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Auto-save indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
      >
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>Auto-save enabled — your progress is saved automatically</span>
      </motion.div>
    </div>
  );
}
