import { Router } from "express";
import { z } from "zod";
import dotenv from "dotenv";
import { TOTP } from "totp-generator";
import base32 from "hi-base32";
import nodemailer from "nodemailer";
import { prisma } from "../db.js";

dotenv.config();
const userRouter = Router();

const signInSchema = z.object({
  email: z.email(),
  password: z.string(),
});

const OAuthSchema = z.object({
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  image: z.string(),
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  port: 587,
  secure: false,
  auth: {
    user: process.env.USER_EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

userRouter.post("/signin", async (req, res) => {
  const { success, data } = signInSchema.safeParse(req.body);
  if (!success) {
    res.status(400).json({
      message: "Invalid input",
      success: false,
    });
    return;
  }

  const { email, password } = data;
  console.log("data", data);

  const existingUser = await prisma.user.findFirst({ where: { email } });
  if (!existingUser) {
    res.status(404).json({
      message: "User not found",
      success: false,
    });
    return;
  }
  const validatePassword = password === existingUser?.password!;

  if (!validatePassword) {
    console.log("hi there");
    res.status(401).json({
      message: "Invalid Credentials",
      success: false,
    });
    return;
  }
  console.log("hello");
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
        isVerified: true,
      },
    });
    res.status(200).json({
      message: "Login Successful",
      success: true,
      id: newUser.id,
      isVerified: newUser.isVerified,
    });
    return;
  }

  res.status(200).json({
    message: "Login Successful",
    success: true,
    id: user.id,
    isVerified: user.isVerified,
  });
  return;
});

userRouter.post("/send-otp", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  if (!email || !password) {
    res.status(401).json({ message: "Invalid input", success: false });
    return;
  }

  const user = await prisma.user.findFirst({ where: { email } });
  if (user) {
    res
      .status(400)
      .json({ message: "User already exists with this email", success: false });
    return;
  }

  await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      password,
    },
  });

  const { otp } = TOTP.generate(base32.encode(email + process.env.JWT_SECRET!));

  const existingOtp = await prisma.otpStore.findFirst({ where: { email } });
  if (existingOtp) await prisma.otpStore.delete({ where: { email } });

  await prisma.otpStore.create({
    data: {
      email,
      otp: otp,
      createdAt: new Date(),
    },
  });

  console.log("sending otp", otp);
  try {
    const info = await transporter.sendMail({
      from: "Aperture Team",
      to: email,
      subject: "Sign Up to Aperture ",
      html: `<b>Sign Up using the otp ${otp}</b>`,
    });
    console.log("Email sent:", info);
  } catch (error) {
    console.error("Failed to send email:", error);
    res
      .status(400)
      .json({ message: "Failed to send OTP email", success: false });
    return;
  }

  console.log("otp sent");
  res
    .status(200)
    .json({ message: "OTP send to your provided email", success: false });
  return;
});

userRouter.post("/verify-otp", async (req, res) => {
  console.log("siuiii");
  const { email, otp } = await req.body;

  if (!otp || !email) {
    res
      .status(400)
      .json({ message: "Could not find the otp or email!", success: false });
    return;
  }

  const sentOtp = await prisma.otpStore.findFirst({
    where: {
      email,
    },
  });

  if (sentOtp && Date.now() - sentOtp.createdAt.getTime() > 5 * 60 * 1000) {
    res.status(410).json({ message: "OTP expired", success: false });
    return;
  }

  if (sentOtp?.otp === otp) {
    await prisma.user.update({ where: { email }, data: { isVerified: true } });
    await prisma.otpStore.delete({ where: { email } });
    res.status(200).json({ message: "OTP verified", success: true });
    return;
  }
  if (sentOtp?.otp != otp) {
    res.status(401).json({ message: "Invalid OTP", success: false });
    return;
  }
  res.status(500).json({ message: "Some error occurred", success: false });
  return;
});

export default userRouter;
