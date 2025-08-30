-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "image" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."otpStore" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "otpStore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "public"."User"("id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "otpStore_id_key" ON "public"."otpStore"("id");

-- CreateIndex
CREATE UNIQUE INDEX "otpStore_email_key" ON "public"."otpStore"("email");

-- CreateIndex
CREATE UNIQUE INDEX "otpStore_otp_key" ON "public"."otpStore"("otp");
