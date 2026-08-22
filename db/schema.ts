import { pgTable, text, integer, timestamp, primaryKey, unique, boolean } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { AdapterAccountType } from "@auth/core/adapters";

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/cinely";
export const pool = postgres(connectionString, { max: 10, idle_timeout: 20, connect_timeout: 10 });
export const db = drizzle(pool);

export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable("account", {
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").$type<AdapterAccountType>().notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (account) => [
  { compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }) },
]);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const watchlist = pgTable("watchlist", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  contentId: integer("contentId").notNull(),
  mediaType: text("mediaType").notNull().$type<"movie" | "tv">(),
  status: text("status").notNull().default("watching").$type<"watching" | "waiting" | "finished">(),
  lastWatchedSeason: integer("lastWatchedSeason"),
  lastWatchedEpisode: integer("lastWatchedEpisode"),
  lastWatchedAt: timestamp("lastWatchedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
}, (table) => [unique().on(table.userId, table.contentId, table.mediaType)]);
