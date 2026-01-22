/*
 * =========================================================================================
 *  EXAMPLE API CLIENT
 * =========================================================================================
 *
 * WHAT IS THIS?
 * This is a "Helper Class". It handles the nitty-gritty details of talking to an
 * external API (in this case, the San Francisco Open Data/Socrata API).
 *
 * HOW DOES IT WORK?
 * It wraps HTTP requests (using `axios`) so that your main function file doesn't
 * get cluttered with URL building and API keys.
 *
 * WHY IS IT HERE?
 * To keep your code clean and organized. The main service file (`sf311Functions.ts`)
 * focuses on *logic* (what to do), while this file focuses on *mechanics* (how to connect).
 *
 * -----------------------------------------------------------------------------------------
 *
 * A helper class for the SF311 example service to talk to the Socrata API.
 * You likely won't need this unless you are also working with Socrata/SF Data.
 * =========================================================================================
 */

import axios from "axios";
import { configDotenv } from "dotenv";
import { GeoLocation } from "../utils/interfaces";

configDotenv();

const SOCRATA_DATASET_ID = "vw6y-z8j6";
const SOCRATA_BASE_URL = `https://data.sfgov.org/api/v3/views/${SOCRATA_DATASET_ID}/query.json`;

/**
 * Handles communication with the Socrata Open Data API (SODA)
 */
export class SocrataClient {
  private appToken: string;

  constructor() {
    this.appToken = process.env.SF_DATA_APP_TOKEN || "";
    if (!this.appToken) {
      console.warn(
        "⚠️ Warning: SF_DATA_APP_TOKEN is missing. Requests will be rate-limited.",
      );
    }
  }

  /**
   * Execute a SoQL Query against the SF 311 Dataset
   */
  async executeQuery<T>(soqlQuery: string): Promise<T[]> {
    try {
      console.log(`[SoQL] Executing: ${soqlQuery}`);

      const response = await axios.post(
        SOCRATA_BASE_URL,
        { query: soqlQuery },
        {
          headers: {
            "X-App-Token": this.appToken,
            "Content-Type": "application/json",
          },
        },
      );
      return response.data;
    } catch (error: any) {
      console.error(
        "Socrata API Error:",
        error.response?.data || error.message,
      );
      throw new Error(`Failed to fetch 311 data: ${error.message}`);
    }
  }
}

/**
 * Handles Geocoding (Address -> Lat/Long)
 * Uses OpenStreetMap (Nominatim) free API
 */
export class GeoClient {
  async geocode(address: string): Promise<GeoLocation | null> {
    try {
      // Append 'San Francisco' to ensure we look in the right city
      const query = `${address}, San Francisco, CA`;
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;

      console.log(`[Geo] Geocoding: ${query}`);

      // Nominatim requires a User-Agent
      const response = await axios.get(url, {
        headers: { "User-Agent": "DaemoSFAgent/1.0" },
      });

      if (response.data && response.data.length > 0) {
        return {
          lat: parseFloat(response.data[0].lat),
          lon: parseFloat(response.data[0].lon),
          display_name: response.data[0].display_name,
        };
      }
      return null;
    } catch (error: any) {
      console.error("Geocoding Error:", error.message);
      throw new Error("Failed to geocode address.");
    }
  }
}
