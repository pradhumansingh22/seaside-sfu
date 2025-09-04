import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import type { CustomPayload, CustomReq } from "../types/customTypes.js";


export const authMiddleware = async (
  req: CustomReq,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ message: "No token" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as CustomPayload;
    if (decoded.isVerified) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ message: "Invalid token" });
    return;
  }
};
export { CustomReq };

