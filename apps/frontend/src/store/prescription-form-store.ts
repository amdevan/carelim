import { create } from "zustand";

/* ─── Types ─── */

interface MedicineItemDraft {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: string;
  instructions: string;
}

interface PrescriptionFormState {
  form: {
    patientId: string;
    doctorId: string;
    diagnosis: string;
    symptoms: string;
    vitals: string;
    advice: string;
    followUp: string;
  };
  clinical: {
    chiefComplaints: string;
    presentIllness: string;
    historyDuration: string;
    severity: string;
    associatedSymptoms: string;
    pastMedical: { diabetes: boolean; hypertension: boolean; asthma: boolean; thyroid: boolean; tuberculosis: boolean; heartDisease: boolean; kidneyDisease: boolean; cancer: boolean; others: string };
    surgicalHistory: string;
    allergies: { drug: string; food: string; latex: boolean; none: boolean };
    personalHistory: { smoking: string; alcohol: string; tobacco: string; exercise: string; diet: string; sleep: string };
    obstetricHistory: { lmp: string; gravida: string; para: string };
    familyHistory: { father: string; mother: string; geneticDisease: string; cancerHistory: string; diabetes: boolean; hypertension: boolean; heartDisease: boolean };
    generalAppearance: { pallor: string; icterus: string; cyanosis: string; clubbing: string; edema: string; lymphNodes: string };
    systemicExamination: { cvs: string; rs: string; cns: string; abdomen: string; ent: string; eye: string; skin: string };
    diagnosisDetail: { primary: string; secondary: string; icd10: string; icd11: string };
    clinicalNotes: string;
    investigations: { name: string; reason: string; priority: string; status: string }[];
    procedures: { name: string; date: string; notes: string }[];
    adviceDetail: { diet: string; lifestyle: string; exercise: string; hydration: string; restrictions: string; travel: string };
    followUpDetail: { date: string; department: string; doctor: string; nextReason: string };
    referral: { referredTo: string; hospital: string; doctor: string; reason: string };
    vitalsDetail: { height: string; weight: string; bmi: string; temperature: string; pulse: string; respiration: string; bp: string; spo2: string; bloodSugar: string; painScore: string };
  };
  items: MedicineItemDraft[];
}

const INITIAL_FORM: PrescriptionFormState["form"] = {
  patientId: "",
  doctorId: "",
  diagnosis: "",
  symptoms: "",
  vitals: "",
  advice: "",
  followUp: "",
};

const INITIAL_CLINICAL: PrescriptionFormState["clinical"] = {
  chiefComplaints: "",
  presentIllness: "",
  historyDuration: "",
  severity: "Moderate",
  associatedSymptoms: "",
  pastMedical: { diabetes: false, hypertension: false, asthma: false, thyroid: false, tuberculosis: false, heartDisease: false, kidneyDisease: false, cancer: false, others: "" },
  surgicalHistory: "",
  allergies: { drug: "", food: "", latex: false, none: false },
  personalHistory: { smoking: "", alcohol: "", tobacco: "", exercise: "", diet: "", sleep: "" },
  obstetricHistory: { lmp: "", gravida: "", para: "" },
  familyHistory: { father: "", mother: "", geneticDisease: "", cancerHistory: "", diabetes: false, hypertension: false, heartDisease: false },
  generalAppearance: { pallor: "", icterus: "", cyanosis: "", clubbing: "", edema: "", lymphNodes: "" },
  systemicExamination: { cvs: "", rs: "", cns: "", abdomen: "", ent: "", eye: "", skin: "" },
  diagnosisDetail: { primary: "", secondary: "", icd10: "", icd11: "" },
  clinicalNotes: "",
  investigations: [{ name: "", reason: "", priority: "Routine", status: "Ordered" }],
  procedures: [{ name: "", date: "", notes: "" }],
  adviceDetail: { diet: "", lifestyle: "", exercise: "", hydration: "", restrictions: "", travel: "" },
  followUpDetail: { date: "", department: "", doctor: "", nextReason: "" },
  referral: { referredTo: "", hospital: "", doctor: "", reason: "" },
  vitalsDetail: { height: "", weight: "", bmi: "", temperature: "", pulse: "", respiration: "", bp: "", spo2: "", bloodSugar: "", painScore: "" },
};

const emptyItem = (): MedicineItemDraft => ({
  medicineName: "",
  dosage: "",
  frequency: "1-0-0",
  duration: "",
  quantity: "1",
  instructions: "",
});

interface PrescriptionFormActions {
  setForm: (patch: Partial<PrescriptionFormState["form"]>) => void;
  setClinical: (patch: Partial<PrescriptionFormState["clinical"]>) => void;
  setClinicalNested: <K extends keyof PrescriptionFormState["clinical"]>(
    key: K,
    patch: Partial<PrescriptionFormState["clinical"][K]>
  ) => void;
  setItems: (items: MedicineItemDraft[] | ((prev: MedicineItemDraft[]) => MedicineItemDraft[])) => void;
  updateItem: (idx: number, patch: Partial<MedicineItemDraft>) => void;
  addItem: () => void;
  removeItem: (idx: number) => void;
  resetForm: () => void;
  setInvestigation: (idx: number, patch: Partial<PrescriptionFormState["clinical"]["investigations"][0]>) => void;
  addInvestigation: () => void;
  removeInvestigation: (idx: number) => void;
  setProcedure: (idx: number, patch: Partial<PrescriptionFormState["clinical"]["procedures"][0]>) => void;
  addProcedure: () => void;
  removeProcedure: (idx: number) => void;
}

export const useFormStore = create<PrescriptionFormState & PrescriptionFormActions>((set) => ({
  form: { ...INITIAL_FORM },
  clinical: { ...INITIAL_CLINICAL },
  items: [emptyItem()],

  setForm: (patch) => set((s) => ({ form: { ...s.form, ...patch } })),

  setClinical: (patch) => set((s) => ({ clinical: { ...s.clinical, ...patch } })),

  setClinicalNested: (key, patch) =>
    set((s) => ({
      clinical: {
        ...s.clinical,
        [key]: { ...(s.clinical[key] as Record<string, unknown>), ...patch },
      },
    })),

  setItems: (items) =>
    set((s) => ({
      items: typeof items === "function" ? items(s.items) : items,
    })),

  updateItem: (idx, patch) =>
    set((s) => ({
      items: s.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    })),

  addItem: () => set((s) => ({ items: [...s.items, emptyItem()] })),

  removeItem: (idx) => set((s) => ({ items: s.items.filter((_, i) => i !== idx) })),

  resetForm: () =>
    set({
      form: { ...INITIAL_FORM },
      clinical: { ...INITIAL_CLINICAL },
      items: [emptyItem()],
    }),

  setInvestigation: (idx, patch) =>
    set((s) => ({
      clinical: {
        ...s.clinical,
        investigations: s.clinical.investigations.map((x, i) =>
          i === idx ? { ...x, ...patch } : x
        ),
      },
    })),

  addInvestigation: () =>
    set((s) => ({
      clinical: {
        ...s.clinical,
        investigations: [
          ...s.clinical.investigations,
          { name: "", reason: "", priority: "Routine", status: "Ordered" },
        ],
      },
    })),

  removeInvestigation: (idx) =>
    set((s) => ({
      clinical: {
        ...s.clinical,
        investigations: s.clinical.investigations.filter((_, i) => i !== idx),
      },
    })),

  setProcedure: (idx, patch) =>
    set((s) => ({
      clinical: {
        ...s.clinical,
        procedures: s.clinical.procedures.map((x, i) =>
          i === idx ? { ...x, ...patch } : x
        ),
      },
    })),

  addProcedure: () =>
    set((s) => ({
      clinical: {
        ...s.clinical,
        procedures: [...s.clinical.procedures, { name: "", date: "", notes: "" }],
      },
    })),

  removeProcedure: (idx) =>
    set((s) => ({
      clinical: {
        ...s.clinical,
        procedures: s.clinical.procedures.filter((_, i) => i !== idx),
      },
    })),
}));
