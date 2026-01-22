/*
 * =========================================================================================
 *  CORE UTILS - DO NOT MODIFY
 * =========================================================================================
 *
 * Shared interfaces and types used across the application.
 * While you CAN add new interfaces here, it is often better to keep
 * service-specific types within your 'src/services' modules.
 * =========================================================================================
 */

/**
 * 311 Case Interface based on Socrata Dataset vw6y-z8j6
 */
export interface SF311Case {
  service_request_id: string;
  requested_datetime: string;
  closed_date?: string;
  updated_datetime: string;
  status_description: string;
  status_notes?: string;
  agency_responsible: string;
  service_name: string; // High level category (e.g., "Street and Sidewalk Cleaning")
  service_subtype: string; // Specific type
  service_details?: string;
  address?: string;
  neighborhoods_sffind_boundaries?: string;
  lat?: string;
  long?: string;
  media_url?: { url: string } | string; // Allow both just in case
  source?: string; // Mobile App, Phone, Web, etc.
}

/**
 * Interface for Aggregated Stats
 */
export interface AnalyticResult {
  grouping: string;
  count: string; // Socrata returns counts as strings in JSON sometimes
}

export interface GeoLocation {
  lat: number;
  lon: number;
  display_name: string;
}
