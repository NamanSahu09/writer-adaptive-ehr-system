import {
  pgTable,
  text,
  timestamp,
  boolean,
  serial,
  integer,
  jsonb,
  date,
  numeric,
} from 'drizzle-orm/pg-core'

// --- Better Auth required tables -------------------------------------------
// Column names are camelCase to match Better Auth's defaults. Do not rename.

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  role: text('role').notNull().default('doctor'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  issuer: text('issuer'),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

// --- App tables --------------------------------------------------------------

export const doctors = pgTable('doctors', {
  id: serial('id').primaryKey(),
  userId: text('user_id'),
  fullName: text('full_name').notNull(),
  specialty: text('specialty'),
  licenseNumber: text('license_number'),
  phone: text('phone'),
  email: text('email'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const patients = pgTable('patients', {
  id: serial('id').primaryKey(),
  fullName: text('full_name').notNull(),
  dateOfBirth: date('date_of_birth'),
  gender: text('gender'),
  phone: text('phone'),
  address: text('address'),
  medicalRecordNumber: text('medical_record_number').unique(),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const doctorStyleProfiles = pgTable('doctor_style_profiles', {
  id: serial('id').primaryKey(),
  doctorId: integer('doctor_id').notNull(),
  abbreviations: jsonb('abbreviations').default({}),
  commonPrescriptions: jsonb('common_prescriptions').default([]),
  specialtyTerminology: jsonb('specialty_terminology').default([]),
  writingPatterns: jsonb('writing_patterns').default({}),
  frequentMedicines: jsonb('frequent_medicines').default([]),
  correctionStats: jsonb('correction_stats').default({}),
  modelMetadata: jsonb('model_metadata').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const opdCards = pgTable('opd_cards', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id'),
  doctorId: integer('doctor_id'),
  uploadedBy: text('uploaded_by').notNull(),
  imagePathname: text('image_pathname').notNull(),
  originalFilename: text('original_filename'),
  status: text('status').notNull().default('uploaded'),
  visitDate: date('visit_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const extractedData = pgTable('extracted_data', {
  id: serial('id').primaryKey(),
  opdCardId: integer('opd_card_id').notNull(),
  rawText: text('raw_text'),
  structuredData: jsonb('structured_data').default({}),
  confidenceScores: jsonb('confidence_scores').default({}),
  overallConfidence: numeric('overall_confidence', { precision: 5, scale: 4 }),
  modelUsed: text('model_used'),
  processingTimeMs: integer('processing_time_ms'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const ehrRecords = pgTable('ehr_records', {
  id: serial('id').primaryKey(),
  opdCardId: integer('opd_card_id'),
  patientId: integer('patient_id'),
  doctorId: integer('doctor_id'),
  createdBy: text('created_by').notNull(),
  chiefComplaint: text('chief_complaint'),
  diagnosis: text('diagnosis'),
  vitalSigns: jsonb('vital_signs').default({}),
  prescriptions: jsonb('prescriptions').default([]),
  labOrders: jsonb('lab_orders').default([]),
  clinicalNotes: text('clinical_notes'),
  followUpDate: date('follow_up_date'),
  status: text('status').notNull().default('draft'),
  finalizedAt: timestamp('finalized_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const verificationRecords = pgTable('verification_records', {
  id: serial('id').primaryKey(),
  opdCardId: integer('opd_card_id').notNull(),
  extractedDataId: integer('extracted_data_id'),
  verifiedBy: text('verified_by').notNull(),
  status: text('status').notNull().default('pending'),
  verifiedFields: jsonb('verified_fields').default({}),
  flaggedFields: jsonb('flagged_fields').default([]),
  reviewerNotes: text('reviewer_notes'),
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const correctionLogs = pgTable('correction_logs', {
  id: serial('id').primaryKey(),
  extractedDataId: integer('extracted_data_id'),
  doctorId: integer('doctor_id'),
  correctedBy: text('corrected_by').notNull(),
  fieldName: text('field_name').notNull(),
  originalValue: text('original_value'),
  correctedValue: text('corrected_value'),
  correctionType: text('correction_type'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: text('user_id'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  details: jsonb('details'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const trainingJobs = pgTable('training_jobs', {
  id: serial('id').primaryKey(),
  doctorId: integer('doctor_id'),
  status: text('status').notNull().default('pending'),
  samplesCount: integer('samples_count').default(0),
  adapterPath: text('adapter_path'),
  metrics: jsonb('metrics').default({}),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

