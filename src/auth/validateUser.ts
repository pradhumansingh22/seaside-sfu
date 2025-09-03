import { NextFunction, Request, Response } from "express";
import { prisma } from "../db.js";

export const validateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const id = req.body.id;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user)
    return res
      .status(404)
      .json({ success: false, message: "No user found with the given Id" });
  if (!user.isVerified) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  next();
};
