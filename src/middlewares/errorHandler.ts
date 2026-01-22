/*
 * =========================================================================================
 *  CORE MIDDLEWARE - DO NOT MODIFY
 * =========================================================================================
 */

import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.error(err.stack);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({ error: "Internal server error!" });
}
