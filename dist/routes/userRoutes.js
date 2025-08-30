var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import bcrypt from "bcrypt";
const userRouter = Router();
const signInSchema = z.object({
    email: z.email(),
    password: z.string(),
});
userRouter.post("/signin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { success, data } = signInSchema.safeParse(req.body);
    if (!success) {
        res.status(400).json({
            message: "Invalid input",
        });
        return;
    }
    const { email, password } = data;
    const existingUser = yield prisma.user.findFirst({ where: { email } });
    if (!existingUser) {
        res.status(404).json({
            message: "User not found",
        });
        return;
    }
    const validatePassword = yield bcrypt.compare(password, existingUser === null || existingUser === void 0 ? void 0 : existingUser.password);
    if (!validatePassword) {
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
}));
export default userRouter;
