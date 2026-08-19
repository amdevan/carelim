import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { nanoid } from "nanoid";

// POST /api/onboarding — Complete onboarding: create organization, admin, modules, subscription
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { basicInfo, selectedModules, selectedPlan, skipPackage } = body;

    // Validate required fields
    if (!basicInfo?.clinicName || !basicInfo?.clinicType) {
      return NextResponse.json(
        { error: "Clinic name and type are required" },
        { status: 400 }
      );
    }
    if (!basicInfo?.adminFullName || !basicInfo?.adminEmailAddress) {
      return NextResponse.json(
        { error: "Administrator name and email are required" },
        { status: 400 }
      );
    }
    if (!basicInfo?.adminMobileNumber) {
      return NextResponse.json(
        { error: "Administrator mobile number is required" },
        { status: 400 }
      );
    }
    if (!basicInfo?.adminPassword) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email: basicInfo.adminEmailAddress },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Generate Clinic ID and subdomain
    const clinicId = `CLINIC-${nanoid(8).toUpperCase()}`;
    const baseSubdomain = basicInfo.clinicName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    let subdomain = baseSubdomain || `clinic-${nanoid(4)}`;

    // Ensure subdomain is unique
    let subdomainExists = await db.organization.findUnique({
      where: { subdomain },
    });
    let counter = 1;
    while (subdomainExists) {
      subdomain = `${baseSubdomain}-${counter}`;
      subdomainExists = await db.organization.findUnique({
        where: { subdomain },
      });
      counter++;
    }

    // Create organization
    const organization = await db.organization.create({
      data: {
        name: basicInfo.clinicName,
        clinicType: basicInfo.clinicType,
        registrationNo: basicInfo.registrationNumber || null,
        panVatNo: basicInfo.panVatNumber || null,
        country: basicInfo.country || null,
        stateProvince: basicInfo.stateProvince || null,
        city: basicInfo.city || null,
        fullAddress: basicInfo.fullAddress || null,
        googleMapUrl: basicInfo.googleMapLocation || null,
        logoUrl: basicInfo.clinicLogoPreview || null,
        clinicId,
        subdomain,
      },
    });

    // Create super admin role if it doesn't exist
    let superAdminRole = await db.role.findUnique({
      where: { name: "Super Admin" },
    });
    if (!superAdminRole) {
      superAdminRole = await db.role.create({
        data: {
          name: "Super Admin",
          description: "Full access to all modules and settings",
          isSystem: true,
        },
      });
    }

    // Create super admin user
    const adminUser = await db.user.create({
      data: {
        name: basicInfo.adminFullName,
        email: basicInfo.adminEmailAddress,
        password: basicInfo.adminPassword,
        phone: basicInfo.adminMobileNumber,
        roleId: superAdminRole.id,
        status: "active",
        lastLogin: new Date(),
      },
    });

    // Update organization with admin user ID
    await db.organization.update({
      where: { id: organization.id },
      data: { adminUserId: adminUser.id },
    });

    // Create organization modules
    if (selectedModules && selectedModules.length > 0) {
      await db.organizationModule.createMany({
        data: selectedModules.map((modKey: string) => {
          const mod = require("@/components/onboarding/module-data").MODULES.find(
            (m: any) => m.key === modKey
          );
          return {
            organizationId: organization.id,
            moduleKey: modKey,
            moduleName: mod?.name || modKey,
            category: mod?.category || "core",
            enabled: true,
          };
        }),
      });
    }

    // Create subscription
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    let planName = "free_trial";
    let planLabel = "Free Trial";
    let price = 0;
    let billingCycle = "one-time";

    if (!skipPackage && selectedPlan) {
      planName = selectedPlan.id || "free_trial";
      planLabel = selectedPlan.label || "Free Trial";
      price = selectedPlan.price || 0;
      billingCycle = selectedPlan.billingCycle || "monthly";
    }

    const subscription = await db.subscription.create({
      data: {
        organizationId: organization.id,
        planName,
        planLabel,
        price,
        currency: "NPR",
        billingCycle,
        trialEndsAt: skipPackage || planName === "free_trial" ? trialEndsAt : null,
        status: skipPackage || planName === "free_trial" ? "trial" : "active",
        couponCode: body.packageSelection?.couponCode || null,
        referralCode: body.packageSelection?.referralCode || null,
        paymentMethod: body.packageSelection?.paymentMethod || null,
        maxUsers: planName === "starter" ? 5 : planName === "professional" ? 9999 : null,
      },
    });

    // Create default organization settings
    const defaultSettings = [
      { key: "timezone", value: "Asia/Kathmandu", category: "general" },
      { key: "currency", value: "NPR", category: "general" },
      { key: "date_format", value: "DD/MM/YYYY", category: "general" },
      { key: "language", value: "en", category: "general" },
      { key: "sms_enabled", value: "true", category: "notifications" },
      { key: "whatsapp_enabled", value: "true", category: "notifications" },
      { key: "email_notifications", value: "true", category: "notifications" },
    ];

    await db.organizationSetting.createMany({
      data: defaultSettings.map((s) => ({
        organizationId: organization.id,
        ...s,
      })),
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        user: basicInfo.adminEmailAddress,
        action: "ONBOARDING_COMPLETE",
        module: "Organization",
        detail: `Created organization: ${basicInfo.clinicName} with ${selectedModules?.length || 0} modules and ${planLabel} plan`,
        ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    // Return success response
    return NextResponse.json(
      {
        success: true,
        organization: {
          id: organization.id,
          name: organization.name,
          clinicId: organization.clinicId,
          subdomain: organization.subdomain,
          clinicUrl: `${organization.subdomain}.carelim.com`,
        },
        adminUser: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          role: superAdminRole.name,
        },
        subscription: {
          id: subscription.id,
          planName: subscription.planName,
          planLabel: subscription.planLabel,
          trialEndsAt: subscription.trialEndsAt,
          status: subscription.status,
        },
        selectedModules: selectedModules || [],
        moduleCount: selectedModules?.length || 0,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding. Please try again." },
      { status: 500 }
    );
  }
}

// GET /api/onboarding — Get onboarding session data (for auto-save restore)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const session = await db.onboardingSession.findUnique({
      where: { sessionId },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      sessionId: session.sessionId,
      organizationData: session.organizationData,
      selectedModules: session.selectedModules,
      selectedPlan: session.selectedPlan,
      currentStep: session.currentStep,
      completedSteps: session.completedSteps,
    });
  } catch (error) {
    console.error("Get onboarding session error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve session" },
      { status: 500 }
    );
  }
}

// PUT /api/onboarding — Auto-save onboarding progress
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, organizationData, selectedModules, selectedPlan, currentStep, completedSteps } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const session = await db.onboardingSession.upsert({
      where: { sessionId },
      update: {
        organizationData: organizationData || undefined,
        selectedModules: selectedModules || undefined,
        selectedPlan: selectedPlan || undefined,
        currentStep: currentStep || 1,
        completedSteps: completedSteps || undefined,
        updatedAt: new Date(),
      },
      create: {
        sessionId,
        organizationData: organizationData || undefined,
        selectedModules: selectedModules || undefined,
        selectedPlan: selectedPlan || undefined,
        currentStep: currentStep || 1,
        completedSteps: completedSteps || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      sessionId: session.sessionId,
      updatedAt: session.updatedAt,
    });
  } catch (error) {
    console.error("Auto-save error:", error);
    return NextResponse.json(
      { error: "Failed to save progress" },
      { status: 500 }
    );
  }
}
