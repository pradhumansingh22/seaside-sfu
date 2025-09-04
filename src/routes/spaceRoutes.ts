import { Router } from "express";
import dotenv from "dotenv";
import { authMiddleware } from "../auth/middleware.js";
import type { CustomReq } from "../types/customTypes.js";
import crypto from "crypto";
import { prisma } from "../db.js";

dotenv.config();

const spaceRouter = Router();

spaceRouter.post("/create", authMiddleware, async (req: CustomReq, res) => {
  const hostId = req.user?.id!;
  const inviteToken = crypto.randomBytes(10).toString("hex");
  console.log(inviteToken);
  try {
    const newSpace = await prisma.space.create({
      data: {
        hostId,
        participants: [hostId],
        createdAt: new Date(Date.now()),
        inviteToken,
        status: "active",
      },
    });
      res.status(200).json({ success: true, message: "space created", inviteToken, status: newSpace.status, createAt: newSpace.createdAt });
      return;
  } catch (error) {
      res.status(500).json({ success: false, message: "server error" });
      console.log("Some error occurred", error);
      return;
  }
});

export default spaceRouter;
