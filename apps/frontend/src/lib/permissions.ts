/**
 * Permission utility for RBAC.
 * Permissions are stored as "Module.action" strings (e.g., "Patient.view", "Invoice.create").
 */

// Map sidebar nav keys to their required permission module name
export const NAV_KEY_TO_MODULE: Record<string, string> = {
  // Core
  dashboard: "Dashboard",
  appointments: "Appointment",
  patients: "Patient",
  doctors: "Doctor",
  emr: "EMR",
  "clinical-notes": "EMR",

  // Diagnostics
  laboratory: "Laboratory",
  radiology: "Radiology",

  // Operations
  pharmacy: "Pharmacy",
  inventory: "Inventory",

  // Finance
  billing: "Billing",
  accounting: "Billing",
  reports: "Reports",
  insurance: "Billing",

  // Administration
  hr: "HR",
  staff: "HR",
  leave: "HR",
  audit: "Audit",
  settings: "Settings",
  branches: "Settings",
  "tenant-settings": "Settings",

  // Dental (map to EMR module for permissions)
  "dental-odontogram": "EMR",
  "dental-examination": "EMR",
  "dental-treatment": "EMR",
  "dental-procedures": "EMR",
  "dental-imaging": "EMR",
  "dental-lab": "EMR",
  "dental-ortho": "EMR",
  "dental-implant": "EMR",
  "dental-followup": "EMR",
  "dental-reports": "EMR",

  // IVF (map to EMR module for permissions)
  "ivf-couples": "EMR",
  "ivf-cycles": "EMR",
  "ivf-protocols": "EMR",
  "ivf-stimulation": "EMR",
  "ivf-follicular": "EMR",
  "ivf-opu": "EMR",
  "ivf-andrology": "EMR",
  "ivf-embryology": "EMR",
  "ivf-cryobank": "EMR",
  "ivf-transfer": "EMR",
  "ivf-pregnancy": "EMR",
  "ivf-donors": "EMR",
  "ivf-consents": "EMR",
  "ivf-packages": "EMR",
  "ivf-reports": "EMR",

  // Platform
  "public-booking": "Settings",
  notifications: "Settings",
  crm: "Settings",
};

/**
 * Check if a user has a specific permission.
 * @param permissions - Array of "Module.action" strings from the user's role
 * @param module - The module name (e.g., "Patient")
 * @param action - The action (e.g., "view", "create", "edit", "delete")
 */
export function hasPermission(permissions: string[], module: string, action: string): boolean {
  // Super admin has all permissions (check for wildcard)
  if (permissions.includes("*.*")) return true;
  return permissions.includes(`${module}.${action}`);
}

/**
 * Check if a user has view permission for a nav key.
 */
export function canViewNavKey(permissions: string[], navKey: string): boolean {
  if (permissions.includes("*.*")) return true;
  const module = NAV_KEY_TO_MODULE[navKey];
  if (!module) return true; // Unknown module = allow (safety fallback)
  return permissions.includes(`${module}.view`);
}
