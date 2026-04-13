import JWT from "jsonwebtoken";
import type { Types } from "mongoose";

const JWT_SECRET = process.env.JWT_SECRET;

export function signAuthToken(userId: Types.ObjectId | string) {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in your environment.");
  }

  return JWT.sign(
    {
      userId: userId.toString(),
    },
    JWT_SECRET
  );
}

export function getFrontendUrl() {
  return process.env.FRONTEND_URL ?? "http://localhost:5173";
}
