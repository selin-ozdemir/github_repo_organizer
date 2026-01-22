/*
 * =========================================================================================
 *  CORE ENGINE FILE - DO NOT MODIFY
 * =========================================================================================
 *
 * This file sets up the Express server, middleware, and routes.
 * It initializes the Daemo Engine and connects your Agent to the platform.
 *
 * For most use cases, you do NOT need to touch this file.
 * Customization should happen in the 'src/services' directory.
 * =========================================================================================
 */

import express, { Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import { errorHandler } from "./middlewares/errorHandler";
import { configDotenv } from "dotenv";
import {
  initializeDaemoService,
  startHostedConnection,
} from "./services/daemoService";
import agentController from "./controllers/agentController";
 
// Load environment variables
configDotenv();

async function startServer() {
  try {
    // Initialize Daemo Service
    console.log("\n=== Initializing Daemo Service ===");
    const sessionData = initializeDaemoService();
    console.log(
      `Registered ${sessionData.Functions.length} functions with Daemo`,
    );

    // Start hosted connection if API key is provided
    await startHostedConnection(sessionData);

    // Create a new express application instance
    const app = express();

    // Logging middleware
    app.use(morgan("dev"));

    // Add CORS middleware
    app.use(cors());

    // Middleware to parse JSON and URL-encoded bodies
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Error handling middleware
    app.use(errorHandler);

    // Define the root path with a greeting message
    app.get("/", (_: Request, res: Response) => {
      res.json({ message: "Welcome to Daemo AI Agent Engine Boilerplate Template!" });
    });

    // Define test endpoint with a greeting message
    app.get("/hello/:name", (req: Request, res: Response) => {
      res.json({ message: `Hello ${req.params.name ?? "World"}!` });
    });

    // Agent routes
    app.post("/agent/query", agentController.processQuery);
    app.post("/agent/query-stream", agentController.processQueryStreamed);
    app.post("/agent/threads", agentController.createThread);
    app.get("/agent/threads", agentController.listThreads);
    app.get("/agent/threads/:threadId", agentController.getThread);
    app.delete("/agent/threads/:threadId", agentController.deleteThread);

    // Set the network port
    const port = process.env.PORT || 5000;

    // Start the Express server
    app.listen(port, () => {
      console.log(`The server is running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Error starting service:\n", error);
    process.exit(1);
  }
}

startServer();
