/*
 * SF 311 Flexible Functions - Optimized
 * Flattened descriptions and defensive coding against SoQL timeouts.
 */

import { DaemoFunction } from "daemo-engine";
import axios from "axios";
import { z } from "zod";
import { configDotenv } from "dotenv";

configDotenv();

const SF_311_APP_TOKEN = process.env.SF_311_APP_TOKEN;
const SF_311_API_BASE =
  "https://data.sfgov.org/api/v3/views/vw6y-z8j6/query.json";

export class SF311Functions {
  private getAuthHeaders() {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (SF_311_APP_TOKEN) {
      headers["X-App-Token"] = SF_311_APP_TOKEN;
    }
    return headers;
  }

  private async runSoql(query: string) {
    console.log(`[SoQL] Executing: ${query}`);
    try {
      const response = await axios.post(
        SF_311_API_BASE,
        { query },
        { headers: this.getAuthHeaders(), timeout: 45000 }, // Increased timeout to 45s
      );
      return response.data;
    } catch (error: any) {
      console.error(
        "[SoQL] Error:",
        error.response?.data?.message || error.message,
      );
      // Return a helpful error message to the AI so it can self-correct
      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        throw new Error(
          "Query timed out. The dataset is too large. Please refine your query: 1. Remove leading wildcards (e.g. use 'Text%' instead of '%Text%'). 2. Reduce the date range. 3. Limit columns.",
        );
      }
      throw new Error(
        `Data fetch failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  @DaemoFunction({
    description:
      "Execute a general search or aggregation using SoQL. Input MUST be a single object. Use this for general counts, grouping, and finding top records.",
    tags: ["311", "search", "aggregate"],
    category: "SF311",
    inputSchema: z.object({
      select: z
        .string()
        .describe(
          "Columns to select (e.g., 'service_name, count(*) as count')",
        ),
      where: z
        .string()
        .optional()
        .describe(
          "Filter conditions (e.g., \"service_name = 'Graffiti' AND supervisor_district = '3'\")",
        ),
      group_by: z
        .string()
        .optional()
        .describe("Group by columns (e.g., 'service_name')"),
      order_by: z
        .string()
        .optional()
        .describe("Order by clause (e.g., 'count DESC')"),
      limit: z.number().default(100),
    }),
    outputSchema: z.object({
      results: z.array(z.any()),
      count: z.number(),
    }),
  })
  async searchOrAggregate(input: {
    select: string;
    where?: string;
    group_by?: string;
    order_by?: string;
    limit: number;
  }) {
    let query = `SELECT ${input.select}`;
    if (input.where) query += ` WHERE ${input.where}`;
    if (input.group_by) query += ` GROUP BY ${input.group_by}`;
    if (input.order_by) query += ` ORDER BY ${input.order_by}`;
    query += ` LIMIT ${input.limit}`;

    const results = await this.runSoql(query);
    return { results, count: results.length };
  }

  @DaemoFunction({
    description:
      "Analyze how long it takes to close cases. Calculates avg, median, min, max duration in days. Fetches raw dates and computes stats in memory.",
    tags: ["311", "analytics", "time"],
    category: "SF311",
    inputSchema: z.object({
      service_name_filter: z
        .string()
        .optional()
        .describe("Exact or prefix match for service name (e.g. 'Encampment')"),
      neighborhood: z.string().optional().describe("Exact neighborhood name"),
      days_ago: z
        .number()
        .default(90)
        .describe("Look back window in days (default 90)"),
    }),
    outputSchema: z.object({
      total_closed_analyzed: z.number(),
      avg_days_to_close: z.number(),
      median_days_to_close: z.number(),
      max_days_to_close: z.number(),
      min_days_to_close: z.number(),
    }),
  })
  async analyzeCycleTimes(input: {
    service_name_filter?: string;
    neighborhood?: string;
    days_ago: number;
  }) {
    const date = new Date();
    date.setDate(date.getDate() - input.days_ago);
    const dateStr = date.toISOString().split(".")[0];

    // Optimize: Fetch strictly necessary columns
    let where = `status_description = 'Closed' AND requested_datetime > '${dateStr}' AND closed_date IS NOT NULL`;

    // Avoid leading wildcard
    if (input.service_name_filter)
      where += ` AND service_name LIKE '${input.service_name_filter}%'`;
    if (input.neighborhood)
      where += ` AND neighborhoods_sffind_boundaries = '${input.neighborhood}'`;

    const query = `SELECT requested_datetime, closed_date WHERE ${where} LIMIT 2000`;

    const rows = await this.runSoql(query);

    if (rows.length === 0) {
      return {
        total_closed_analyzed: 0,
        avg_days_to_close: 0,
        median_days_to_close: 0,
        max_days_to_close: 0,
        min_days_to_close: 0,
      };
    }

    const durations = rows
      .map((r: any) => {
        const start = new Date(r.requested_datetime).getTime();
        const end = new Date(r.closed_date).getTime();
        return (end - start) / (1000 * 60 * 60 * 24);
      })
      .sort((a: number, b: number) => a - b);

    const sum = durations.reduce((a: number, b: number) => a + b, 0);
    const avg = sum / durations.length;
    const mid = Math.floor(durations.length / 2);
    const median =
      durations.length % 2 !== 0
        ? durations[mid]
        : (durations[mid - 1] + durations[mid]) / 2;

    return {
      total_closed_analyzed: rows.length,
      avg_days_to_close: Number(avg.toFixed(2)),
      median_days_to_close: Number(median.toFixed(2)),
      max_days_to_close: Number(durations[durations.length - 1].toFixed(2)),
      min_days_to_close: Number(durations[0].toFixed(2)),
    };
  }

  @DaemoFunction({
    description:
      "Identify 'Zombie' cases: Requests closed and then immediately resubmitted at the same location within 7 days. Input MUST be a single object.",
    tags: ["311", "analytics", "resubmissions"],
    category: "SF311",
    inputSchema: z.object({
      service_name_filter: z
        .string()
        .optional()
        .describe("Service name prefix (e.g. 'Encampment')"),
      district: z
        .string()
        .optional()
        .describe("Supervisor district number (e.g. '6')"),
      days_to_analyze: z
        .number()
        .default(30)
        .describe("Time window (default 30 days due to heavy processing)"),
    }),
    outputSchema: z.object({
      total_cases_scanned: z.number(),
      potential_resubmissions: z.number(),
      resubmission_rate_percent: z.number(),
      examples: z.array(z.any()),
    }),
  })
  async analyzeResubmissions(input: {
    service_name_filter?: string;
    district?: string;
    days_to_analyze: number;
  }) {
    const date = new Date();
    date.setDate(date.getDate() - input.days_to_analyze);
    const dateStr = date.toISOString().split(".")[0];

    let where = `requested_datetime > '${dateStr}'`;
    if (input.service_name_filter)
      where += ` AND service_name LIKE '${input.service_name_filter}%'`;
    if (input.district)
      where += ` AND supervisor_district = '${input.district}'`;

    // Only fetch columns needed for the logic
    const query = `SELECT service_request_id, service_name, service_subtype, address, requested_datetime, closed_date, status_description 
                   WHERE ${where} 
                   ORDER BY address, service_subtype, requested_datetime ASC 
                   LIMIT 3000`;

    const rows = await this.runSoql(query);

    let resubmissions = 0;
    const examples: any[] = [];
    const REOPEN_WINDOW_DAYS = 7;

    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1];
      const curr = rows[i];

      if (
        prev.address === curr.address &&
        prev.service_subtype === curr.service_subtype
      ) {
        if (prev.closed_date) {
          const prevClosed = new Date(prev.closed_date).getTime();
          const currOpened = new Date(curr.requested_datetime).getTime();

          const diffDays = (currOpened - prevClosed) / (1000 * 60 * 60 * 24);

          if (diffDays >= 0 && diffDays <= REOPEN_WINDOW_DAYS) {
            resubmissions++;
            if (examples.length < 5) {
              examples.push({
                original_case: prev.service_request_id,
                closed_at: prev.closed_date,
                resubmitted_case: curr.service_request_id,
                opened_at: curr.requested_datetime,
                address: curr.address,
                issue: curr.service_subtype,
              });
            }
          }
        }
      }
    }

    return {
      total_cases_scanned: rows.length,
      potential_resubmissions: resubmissions,
      resubmission_rate_percent:
        rows.length > 0
          ? Number(((resubmissions / rows.length) * 100).toFixed(2))
          : 0,
      examples,
    };
  }

  @DaemoFunction({
    description:
      "Specialized search for intersection-related queries. Finds requests where the address contains ' / '.",
    tags: ["311", "search", "intersection"],
    category: "SF311",
    inputSchema: z.object({
      service_query: z.string().describe("Exact or partial service name"),
      days_ago: z.number().default(90),
    }),
    outputSchema: z.object({
      count: z.number(),
      results: z.array(z.any()),
    }),
  })
  async findIntersections(input: { service_query: string; days_ago: number }) {
    const date = new Date();
    date.setDate(date.getDate() - input.days_ago);
    const dateStr = date.toISOString().split(".")[0];

    // Performance note: 'LIKE' on address with wildcards is slow, but necessary for intersections.
    // We restrict by date heavily to compensate.
    const query = `SELECT count(*) as count, address, service_name 
                   WHERE service_name LIKE '${input.service_query}%' 
                   AND address LIKE '% / %' 
                   AND requested_datetime > '${dateStr}'
                   GROUP BY address, service_name
                   ORDER BY count DESC
                   LIMIT 50`;

    const results = await this.runSoql(query);
    // Socrata aggregation returns array of objects, not a single count number for the whole set
    const total = results.reduce(
      (acc: number, r: any) => acc + parseInt(r.count),
      0,
    );

    return {
      count: total,
      results,
    };
  }
}
