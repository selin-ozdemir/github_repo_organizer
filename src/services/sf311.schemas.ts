/*
 * =========================================================================================
 *  EXAMPLE SCHEMAS
 * =========================================================================================
 *
 * WHAT IS THIS?
 * This is the "Rulebook" or "Contract". It defines the exact structure of data that
 * your functions expect.
 *
 * HOW DOES IT WORK?
 * We use a library called `Zod` to define data shapes. For example, we say that
 * `service_name` must be a String and is Optional.
 *
 * WHY IS IT HERE?
 * Large Language Models (LLMs) can be unpredictable. These schemas force the AI to
 * provide structured, valid data (JSON) that your code can reliably use, preventing
 * crashes and errors.
 *
 * -----------------------------------------------------------------------------------------
 *
 * This file defines the Zod schemas used by the SF311Functions example service.
 * Schemas allow the AI to strictly validate inputs and outputs.
 *
 * When building your own service, define your input/output schemas in a similar way.
 * =========================================================================================
 */

import { z } from "zod";

// --- GEOCODING ---
export const GeocodeAddressSchema = z.object({
  address: z
    .string()
    .describe(
      "The street address or landmark to look up (e.g. 'Golden Gate Park', '500 Market St')",
    ),
});

// --- LOOKUP ---
export const GetCaseByIdSchema = z.object({
  case_id: z.string().describe("The Service Request ID (e.g. 172340)"),
});

// --- SEARCH ---
export const SearchCasesSchema = z.object({
  status: z
    .enum(["Open", "Closed"])
    .optional()
    .describe("Filter by case status"),
  neighborhood: z
    .string()
    .optional()
    .describe(
      "San Francisco neighborhood name (e.g. 'Mission', 'Marina', 'Tenderloin')",
    ),
  category: z
    .string()
    .optional()
    .describe(
      "General category (e.g. 'Graffiti', 'Street and Sidewalk Cleaning', 'Encampments')",
    ),
  limit: z
    .number()
    .optional()
    .default(10)
    .describe("Max number of records to return"),
  days_ago: z
    .number()
    .optional()
    .describe("Filter for cases created within this many days"),
});

// --- GEO SEARCH ---
export const SearchNearbySchema = z.object({
  latitude: z.number().describe("Latitude coordinate"),
  longitude: z.number().describe("Longitude coordinate"),
  radius_meters: z
    .number()
    .default(300)
    .describe("Radius in meters to search (default 300m)"),
  status: z.enum(["Open", "Closed"]).optional(),
});

// --- ANALYTICS ---
export const AgencyAnalyticsSchema = z.object({
  limit: z.number().optional().default(5),
});

export const NeighborhoodAnalyticsSchema = z.object({
  neighborhood: z.string().describe("The neighborhood to analyze"),
});

export const StalledCasesSchema = z.object({
  days_open: z
    .number()
    .default(30)
    .describe("Minimum number of days the case has been open"),
  neighborhood: z.string().optional().describe("Optional neighborhood filter"),
});

export const SearchCasesInputSchema = z.object({
  status: z
    .string()
    .optional()
    .describe("Case status (e.g., 'Open', 'Closed')"),
  neighborhood: z
    .string()
    .optional()
    .describe("Neighborhood name (e.g., 'Mission')"),
  service_name: z
    .string()
    .optional()
    .describe(
      "Service category (e.g., 'Graffiti', 'Street and Sidewalk Cleaning')",
    ),
  service_subtype: z
    .string()
    .optional()
    .describe("Service subtype (e.g., 'General Cleaning')"),
  supervisor_district: z
    .string()
    .optional()
    .describe("Supervisor district number (e.g., '9')"),
  agency: z
    .string()
    .optional()
    .describe("Responsible agency (e.g., 'DPW Ops Queue')"),
  source: z
    .string()
    .optional()
    .describe("Source of request (e.g., 'Mobile/Open311')"),
  has_media: z
    .boolean()
    .optional()
    .describe("Only show cases with photos/media"),
  days_old_min: z
    .number()
    .optional()
    .describe("Minimum age in days (cases older than this)"),
  days_old_max: z
    .number()
    .optional()
    .describe("Maximum age in days (cases newer than this)"),
  limit: z
    .number()
    .optional()
    .default(100)
    .describe("Maximum number of results (default 100, max 1000)"),
});

export const CaseOutputSchema = z.object({
  service_request_id: z.string(),
  requested_datetime: z.string(),
  closed_date: z.string().optional(),
  updated_datetime: z.string().optional(),
  status_description: z.string(),
  status_notes: z.string().optional(),
  agency_responsible: z.string().optional(),
  service_name: z.string(),
  service_subtype: z.string().optional(),
  service_details: z.string().optional(),
  address: z.string().optional(),
  street: z.string().optional(),
  supervisor_district: z.string().optional(),
  neighborhoods_sffind_boundaries: z.string().optional(),
  police_district: z.string().optional(),
  source: z.string().optional(),
  media_url: z.any().optional(),
  lat: z.string().optional(),
  long: z.string().optional(),
  days_open: z.number().optional(),
});

export const SearchCasesOutputSchema = z.array(CaseOutputSchema);

export const GetCaseByIdInputSchema = z.object({
  case_id: z.string().describe("The SF 311 case ID"),
});

export const GetCaseStatsInputSchema = z.object({
  neighborhood: z.string().optional().describe("Filter by neighborhood"),
  service_name: z.string().optional().describe("Filter by service category"),
  supervisor_district: z
    .string()
    .optional()
    .describe("Filter by supervisor district"),
  days: z
    .number()
    .optional()
    .default(30)
    .describe("Time period in days to analyze"),
});

export const CaseStatsOutputSchema = z.object({
  total_cases: z.number(),
  open_cases: z.number(),
  closed_cases: z.number(),
  avg_days_to_close: z.number().optional(),
  top_services: z.array(
    z.object({
      service: z.string(),
      count: z.number(),
    }),
  ),
  top_neighborhoods: z.array(
    z.object({
      neighborhood: z.string(),
      count: z.number(),
    }),
  ),
});

export const SearchNearLocationInputSchema = z.object({
  latitude: z.number().describe("Latitude of center point"),
  longitude: z.number().describe("Longitude of center point"),
  radius_meters: z
    .number()
    .optional()
    .default(500)
    .describe("Radius in meters (default 500)"),
  status: z
    .string()
    .optional()
    .describe("Filter by status (e.g., 'Open', 'Closed')"),
  service_name: z.string().optional().describe("Filter by service type"),
  days_ago: z.number().optional().describe("Only cases from last N days"),
  limit: z.number().optional().default(100).describe("Max results"),
});

export const GetHotspotsInputSchema = z.object({
  analysis_type: z
    .enum(["street", "neighborhood", "district"])
    .describe("Type of hotspot analysis"),
  service_name: z.string().optional().describe("Filter by service type"),
  days: z.number().optional().default(30).describe("Time period in days"),
  min_cases: z
    .number()
    .optional()
    .default(5)
    .describe("Minimum cases to be considered a hotspot"),
  limit: z.number().optional().default(20).describe("Max results to return"),
});

export const HotspotOutputSchema = z.object({
  location: z.string(),
  case_count: z.number(),
  most_common_service: z.string().optional(),
  avg_days_to_close: z.number().optional(),
});

export const GetTrendsInputSchema = z.object({
  service_name: z.string().optional().describe("Filter by service type"),
  neighborhood: z.string().optional().describe("Filter by neighborhood"),
  days: z.number().optional().default(90).describe("Time period in days"),
  grouping: z
    .enum(["daily", "weekly", "monthly"])
    .optional()
    .default("weekly")
    .describe("Time grouping"),
});

export const TrendDataPointSchema = z.object({
  period: z.string(),
  case_count: z.number(),
  open_count: z.number(),
  closed_count: z.number(),
});

export const CompareNeighborhoodsInputSchema = z.object({
  neighborhoods: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe("2-5 neighborhoods to compare"),
  service_name: z.string().optional().describe("Filter by service type"),
  days: z.number().optional().default(30).describe("Time period"),
});

export const NeighborhoodComparisonSchema = z.object({
  neighborhood: z.string(),
  total_cases: z.number(),
  open_cases: z.number(),
  closed_cases: z.number(),
  avg_days_to_close: z.number().optional(),
  top_service: z.string().optional(),
});

export const GetServiceCatalogInputSchema = z.object({
  days: z.number().optional().default(30).describe("Time period"),
});

export const GetServiceCatalogOutputSchema = z.object({
  service_types: z.array(
    z.object({
      service_name: z.string(),
      count: z.number(),
      avg_days_to_close: z.number().optional(),
    }),
  ),
});

export const GetNeighborhoodListOutputSchema = z.object({
  neighborhoods: z.array(z.string()),
});

export const GetRecentlyUpdatedInputSchema = z.object({
  hours: z
    .number()
    .optional()
    .default(24)
    .describe("Cases updated in last N hours"),
  status: z.string().optional().describe("Filter by status"),
  limit: z.number().optional().default(50).describe("Max results"),
});

export const GetResponseTimeInputSchema = z.object({
  service_name: z.string().optional().describe("Filter by service type"),
  neighborhood: z.string().optional().describe("Filter by neighborhood"),
  days: z.number().optional().default(90).describe("Time period"),
});

export const ResponseTimeOutputSchema = z.object({
  service_or_neighborhood: z.string(),
  avg_days_to_close: z.number(),
  median_days_to_close: z.number(),
  min_days: z.number(),
  max_days: z.number(),
  total_closed_cases: z.number(),
});
