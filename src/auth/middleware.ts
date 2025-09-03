import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

interface CustomReq extends Request {
  user?: {
    id: string;
    email?: string;
    isVerified?: boolean;
  };
}

interface CustomPayload extends JwtPayload {
  id: string;
  email?: string;
  isVerified?: boolean;
}

export const authMiddleware = async (
  req: CustomReq,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as CustomPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid token" });
  }
};
