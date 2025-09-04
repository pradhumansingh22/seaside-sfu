import { JwtPayload } from "jsonwebtoken";
import { Request } from "express";

export interface CustomReq extends Request {
  user?: {
    id: string;
    email?: string;
    isVerified?: boolean;
  };
}

export interface CustomPayload extends JwtPayload {
  id: string;
  email?: string;
  isVerified?: boolean;
}
