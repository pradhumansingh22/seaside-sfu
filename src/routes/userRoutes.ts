import { Router } from "express";
import { prisma } from "../db.js";
import { email, z } from "zod";
import bcrypt from "bcrypt";

const userRouter = Router();

const signInSchema = z.object({
  email: z.email(),
  password: z.string(),
});

const OAuthSchema = z.object({
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
});

userRouter.post("/signin", async (req, res) => {
  const { success, data } = signInSchema.safeParse(req.body);
  if (!success) {
    res.status(400).json({
      message: "Invalid input",
    });
    return;
  }

  const { email, password } = data;
  console.log("data", data);

  const existingUser = await prisma.user.findFirst({ where: { email } });
  if (!existingUser) {
    res.status(404).json({
      message: "User not found",
    });
    return;
  }
  const validatePassword = password === existingUser?.password!;

  if (!validatePassword) {
    console.log("hi there");
    res.status(401).json({
      message: "Invalid Credentials",
    });
    return;
  }
  res.status(200).json({
    message: "Login Successfull",
    success: true,
    id: existingUser.id.toString(),
    email: existingUser.email,
  });
});



userRouter.post("/OAuth-signin", async (req, res) => {
  const { success, data } = OAuthSchema.safeParse(req.body);
  if (!success) {
    res.status(400).json({
      message: "Invalid input",
    });
    return;
  }

  const { email, firstName, lastName } = data;
  console.log("data", data);

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const newUser = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
      },
    });
  }
  res.status(200).json({
    message: "Login Successful",
    success: true,
  });
  return;
});

export default userRouter;
