/**
 * Central Type Exports
 * 
 * This file provides barrel exports for all shared types in the application.
 * Import types from here instead of scattered locations.
 * 
 * Organization:
 * - Auth & User types
 * - Student types  
 * - Application types
 * - Partner types
 * - Admin types
 * - WebSocket & Real-time types
 * - API & Response types
 * - AI & Chat types
 * - Document types
 * - Common types
 */

// ============================================================================
// Auth & User Types
// ============================================================================
export type { SigninInput, SignupInput, PasswordResetInput, PasswordUpdateInput } from '@/lib/validations/auth'
export type { Locale } from '@/i18n/config'

// ============================================================================
// Student Types
// ============================================================================
export type {
  StudentDashboard,
  WorkExperienceEntry,
  EducationHistoryEntry,
  FamilyMemberEntry,
  ExtracurricularActivityEntry,
  AwardEntry,
  PublicationEntry,
  ResearchExperienceEntry,
  ScholarshipApplicationData,
  FinancialGuaranteeData,
  StudentProfile,
  UpdateProfileRequest,
  ApplicationsResponse,
  Application,
  CreateApplicationRequest,
  DocumentsResponse,
  Document,
  MeetingsResponse,
  Meeting,
  NotificationsResponse,
  UnreadCountResponse,
  Notification,
  FavoritesResponse,
  FavoriteResponse,
  Favorite,
  SettingsResponse,
  UserSettings,
  UpdateSettingsRequest,
} from '@/lib/student-api'

export type { StudentCompletionField, StudentSafeColumn } from '@/lib/profile-completion'

// ============================================================================
// Application Types
// ============================================================================
export type {
  CreateApplicationInput,
  UpdateApplicationInput,
  UpdateApplicationStatusInput,
  PriorityInput,
} from '@/lib/validations/application'

export type { CreateApplicationInput as ApplicationFormData } from '@/lib/validations/application'

// ============================================================================
// Partner Types
// ============================================================================
export type { PartnerRole, PartnerUser } from '@/lib/partner/roles'
export type {
  DocumentStatus,
  ExpiryStatus,
  RequestPriority,
  RequestStatus,
  DocumentNotificationType,
} from '@/lib/partner/document-utils'

// ============================================================================
// Admin Types
// ============================================================================
export type { StudentSource, IndividualStudent, PartnerStudent, Student, ApplicationWithPartner, AdminStats } from '@/lib/types/admin-modules'

// ============================================================================
// WebSocket & Real-time Types
// ============================================================================
export type {
  WsMessage,
  WsOptions,
  WsConnection,
  NotificationNewPayload,
  MeetingReminderPayload,
  ApplicationStatusPayload,
  DocumentStatusPayload,
  UnreadCountPayload,
  SubscribeUserPayload,
} from '@/lib/ws-client'

export type { UseWebSocketOptions, UseWebSocketReturn } from '@/hooks/use-websocket'

export type { TaskNotificationPayload } from '@/lib/task-notifications'

// ============================================================================
// API & Response Types
// ============================================================================
export type { APIResponse } from '@/lib/api-response'
export type { PaginationInput, SearchInput, PaginationWithSearchInput } from '@/lib/validations/common'

// ============================================================================
// AI & Chat Types
// ============================================================================
export type { ChatMessage, AIStreamOptions } from '@/lib/ai-client'
export type { ChatMessage as LLMChatMessage, StreamCallback } from '@/lib/llm'
export type { ParsedContent } from '@/lib/chat-utils'
export type {
  ReadabilityResult,
  KeywordDensity,
  ContentStats,
  SEOScore,
} from '@/lib/content-analysis'

// ============================================================================
// Document Types
// ============================================================================
export type { DocumentTypeConfig, DocumentTypeValue } from '@/lib/document-types'

// ============================================================================
// Validation Types (Student Transfer)
// ============================================================================
export type { TransferStudentInput, ReassignApplicationInput, BulkTransferInput } from '@/lib/validations/student-transfer'

// ============================================================================
// Rate Limiting Types
// ============================================================================
export type { RateLimitConfig, RateLimitResult } from '@/lib/rate-limit'