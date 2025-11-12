import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const assets = pgTable("assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pcName: text("pc_name").notNull(),
  employeeNumber: text("employee_number").notNull(),
  username: text("username").notNull(),
  serialNumber: text("serial_number").notNull(),
  macAddress: text("mac_address").notNull(),
  buybackStatus: text("buyback_status").notNull(),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isDeleted: text("is_deleted").default("false").notNull(),
  statusLog: text("status_log").default("Created").notNull(),
});

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isDeleted: true,
  statusLog: true,
}).extend({
  pcName: z.string().min(1, "PC name is required"),
  employeeNumber: z.string().min(1, "Employee number is required"),
  username: z.string().min(1, "Username is required"),
  serialNumber: z.string().min(1, "Serial number is required"),
  macAddress: z.string()
    .min(1, "MAC address is required")
    .regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, "Invalid MAC address format (e.g., 00:1A:2B:3C:4D:5E)"),
  buybackStatus: z.enum(["Pending", "Approved", "In Process", "Completed"]),
  date: z.date(),
});

export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assets.$inferSelect;
