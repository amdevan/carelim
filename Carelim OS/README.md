# Carelim OS

A comprehensive healthcare management system built with Next.js, Prisma, and Tailwind CSS. Carelim OS is a multi-tenant SaaS platform covering clinical operations, IVF, dental, laboratory, pharmacy, accounting, HR, CRM, and more.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** PostgreSQL via Prisma ORM
- **UI:** shadcn/ui + Tailwind CSS
- **State:** Zustand
- **Charts:** Recharts
- **Animations:** Framer Motion
- **Icons:** Lucide React

## Getting Started

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push schema to PostgreSQL database
npx prisma db push

# Seed the database (optional)
npx tsx prisma/seed.ts

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Modules

| Module | Route | Description |
|--------|-------|-------------|
| **CMS** | `/` | Main hospital management dashboard |
| **Admin** | `/admin` | SaaS admin panel (tenants, billing, subscriptions) |
| **Carelim MS** | `/carelim-ms` | CRM, patient source tracking & commission engine |
| **IVF** | `/ivf` | IVF cycle management & embryo tracking |
| **Dental** | `/dental` | Dental module with odontogram |
| **Doctor** | `/doctor` | Doctor panel |
| **Patient** | `/patient` | Patient portal |
| **Booking** | `/book` | Public appointment booking |

## Carelim MS (CRM Module)

The CRM module at `/carelim-ms` includes:

- **Contacts** - Unified contact directory (patients, doctors, clinics, partners, vendors, corporate) with lead scoring
- **Deals Pipeline** - Kanban-style deal tracking with 6 stages (Qualification → Closed Won/Lost)
- **Communications** - Call, email, WhatsApp, SMS, meeting, and note logging
- **Tasks** - Follow-up task management with priority and due date tracking
- **Templates** - Reusable email/message templates with variable support
- **Reports** - Pipeline analytics, contact distribution, deal performance, and monthly trends

### CRM API Endpoints

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/crm-contacts` | GET, POST | List/create contacts |
| `/api/crm-contacts/[id]` | GET, PATCH, DELETE | Contact CRUD with related data |
| `/api/crm-deals` | GET, POST | List/create deals |
| `/api/crm-deals/[id]` | GET, PATCH, DELETE | Deal CRUD with activity logging |
| `/api/crm-communications` | GET, POST | List/create communications |
| `/api/crm-communications/[id]` | GET, PATCH, DELETE | Communication CRUD |
| `/api/crm-tasks` | GET, POST | List/create tasks |
| `/api/crm-tasks/[id]` | GET, PATCH, DELETE | Task CRUD |
| `/api/crm-templates` | GET, POST | List/create email templates |
| `/api/crm-templates/[id]` | GET, PATCH, DELETE | Template CRUD |
| `/api/crm-dashboard` | GET | CRM dashboard KPIs & analytics |

## Database

The project uses Prisma with PostgreSQL. Key model groups:

- **Core HMS** - Patient, Doctor, Appointment, Invoice, Prescription, Staff
- **IVF** - IVFCycle, Embryo, EggRetrieval, EmbryoTransfer, Donor, Consent
- **Dental** - DentalPatient, Odontogram, TreatmentPlan, Procedure
- **Laboratory** - LabOrder, LabResult, LabSample, LabEquipment, LabQC
- **Pharmacy** - Medicine, MedicineBatch, PharmacySale, PurchaseOrder
- **Accounting** - JournalEntry, Expense, Payroll
- **CRM** - CRMContact, CRMDeal, CRMCommunication, CRMTask, CRMActivity, EmailTemplate
- **Carelim MS** - MSLead, Campaign, Referral, CommissionSettlement, PatientSource, CareCoordinator

## Project Structure

```
Carelim OS/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Main seed file
│   └── seed-*.ts              # Module-specific seeds
├── src/
│   ├── app/
│   │   ├── api/               # API routes (150+ endpoints)
│   │   ├── admin/             # SaaS admin page
│   │   ├── carelim-ms/        # CRM module page
│   │   ├── dental/            # Dental module page
│   │   ├── ivf/               # IVF module page
│   │   ├── doctor/            # Doctor panel page
│   │   └── patient/           # Patient portal page
│   ├── components/
│   │   ├── carelim-ms/        # CRM & Carelim MS components
│   │   ├── cms/               # Main CMS components & views
│   │   ├── dental/            # Dental components
│   │   ├── doctor/            # Doctor panel components
│   │   ├── ivf/               # IVF components
│   │   ├── saas/              # SaaS admin components
│   │   └── ui/                # shadcn/ui primitives (47 components)
│   ├── lib/
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── api.ts             # API client helper
│   │   ├── format.ts          # Formatting utilities
│   │   └── export-utils.ts    # CSV/print export
│   └── store/
│       └── app-store.ts       # Zustand state management
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## Environment Variables

```env
DATABASE_URL="postgresql://carelim:carelim123@localhost:5432/carelim?schema=public"
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secure-secret-here
NEXT_PUBLIC_API_URL=""
```

## Docker

```bash
docker-compose up -d
```

## License

Proprietary - All rights reserved.
