import { verify as argon2Verify } from "@node-rs/argon2";
import type { UserRole } from "@ride/contracts";
import { type Db, users } from "@ride/db";
import { eq } from "drizzle-orm";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password");
    this.name = "InvalidCredentialsError";
  }
}

export async function login(db: Db, email: string, password: string): Promise<AuthenticatedUser> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user?.isActive) {
    throw new InvalidCredentialsError();
  }

  const valid = await argon2Verify(user.passwordHash, password);
  if (!valid) {
    throw new InvalidCredentialsError();
  }

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function getUserById(db: Db, userId: string): Promise<AuthenticatedUser | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return undefined;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
