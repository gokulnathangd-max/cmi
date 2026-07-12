import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "d6F3E0a4F3e0A4f3e0A4f3e0A4f3e0A4"; // 32 bytes key for AES-256
const IV_LENGTH = 16;

/**
 * Decrypts a twoFactorSecret string that was encrypted with aes-256-cbc.
 * Falls back to raw text if it is not in encrypted format (e.g. static seed).
 */
function decryptSecret(text: string): string {
  try {
    if (!text.includes(":")) return text;
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift()!, "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    return text;
  }
}

/**
 * Native RFC-6238 compliant TOTP verification helper.
 * Decodes standard base32 secrets and verifies time-varying 6-digit tokens with clock drift tolerance.
 */
function verifyTOTP(token: string, secret: string): boolean {
  try {
    const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = "";
    for (let i = 0; i < secret.length; i++) {
      const val = base32chars.indexOf(secret.charAt(i).toUpperCase());
      if (val !== -1) {
        bits += val.toString(2).padStart(5, "0");
      }
    }
    const bytes: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.substring(i, i + 8), 2));
    }
    const key = Buffer.from(bytes);

    const epoch = Math.round(new Date().getTime() / 1000.0);
    const counter = Math.floor(epoch / 30);

    for (let drift = -1; drift <= 1; drift++) {
      const timeBuffer = Buffer.alloc(8);
      timeBuffer.writeBigInt64BE(BigInt(counter + drift));

      const hmac = crypto.createHmac("sha1", key);
      hmac.update(timeBuffer);
      const hmacResult = hmac.digest();

      const offset = hmacResult[hmacResult.length - 1] & 0xf;
      const code =
        ((hmacResult[offset] & 0x7f) << 24) |
        ((hmacResult[offset + 1] & 0xff) << 16) |
        ((hmacResult[offset + 2] & 0xff) << 8) |
        (hmacResult[offset + 3] & 0xff);

      const computedToken = (code % 1000000).toString().padStart(6, "0");
      if (computedToken === token) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("[TOTP_VERIFICATION_ERROR]", error);
    return false;
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  pin: z.string().optional(),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "mock-google-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock-google-client-secret",
      allowDangerousEmailAccountLinking: false, // Enforce strict account linkage checks
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        pin: { label: "PIN", type: "password" }
      },
      async authorize(credentials) {
        const validated = loginSchema.safeParse(credentials);
        if (!validated.success) return null;

        const { email, password, pin } = validated.data;

        const user = await db.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user || !user.password) return null;
        if (!user.isActive) return null;

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return null;

        // Secure Admin MFA check
        if (user.role === "ADMIN") {
          if (!user.twoFactorSecret) {
            console.warn(`[Auth] Admin user ${email} attempted login without setting up 2FA.`);
            return null;
          }
          if (!pin) {
            console.warn(`[Auth] Admin user ${email} login failed: Missing 2FA PIN.`);
            return null;
          }

          const decryptedSecret = decryptSecret(user.twoFactorSecret);
          const isPinValid = verifyTOTP(pin, decryptedSecret);

          if (!isPinValid) {
            console.warn(`[Auth] Failed admin login attempt for ${email}: Invalid 2FA PIN.`);
            return null;
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as any, // Cast string role to conform to NextAuth User type
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.email = user.email;
        token.name = user.name;
        token.image = user.image;
      }

      // Live database query validation for active status and role changes
      if (token.email) {
        const dbUser = await db.user.findUnique({
          where: { email: token.email },
          select: { isActive: true, role: true },
        });

        // Force logout and clear token cache immediately if user deactivated or deleted
        if (!dbUser || !dbUser.isActive) {
          return null; 
        }

        // Keep role in sync with the live database value
        token.role = dbUser.role;
      }

      // Handle session updates (if updated via trigger client-side)
      if (trigger === "update" && session) {
        if (session.image !== undefined) token.image = session.image;
        if (session.name !== undefined) token.name = session.name;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as any;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.image as string | null | undefined;
      }
      return session;
    },
  },
});