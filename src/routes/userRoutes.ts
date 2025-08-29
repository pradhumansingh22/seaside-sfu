import { Router } from "express";
import { prisma } from "../db.js";

export const userRouter = Router();

userRouter.post("/create", async (req, res) => {
  const body = req.body;
  console.log("hello");
  await prisma.user.create({
    data: {
      email: body.email,
      password: body.password,
      firstName: body.firstName,
      lastName: body.lastName,
    },
  });
});