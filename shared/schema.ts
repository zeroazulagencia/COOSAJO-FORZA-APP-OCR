import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  fileType: text("file_type").notNull(), // 'pdf', 'image'
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  filePath: text("file_path").notNull(),
  status: text("status").notNull().default("queued"), // 'queued', 'processing', 'processed', 'failed'
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
  extractedData: jsonb("extracted_data"), // Will store the extracted fields
  errorMessage: text("error_message"),
  processingTime: integer("processing_time"), // in milliseconds
  confidence: integer("confidence"), // average confidence percentage
});

export const extractedDataSchema = z.object({
  cif: z.string().optional(),
  loanNumber: z.string().optional(),
  account: z.string().optional(),
  fullName: z.string().optional(),
  dpi: z.string().optional(),
  loanAmount: z.string().optional(),
  fieldsFound: z.array(z.string()).default([]),
  fieldsNotFound: z.array(z.string()).default([]),
  confidence: z.record(z.string(), z.number()).optional(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
  processedAt: true,
});

export const updateDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
}).partial();

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type UpdateDocument = z.infer<typeof updateDocumentSchema>;
export type ExtractedData = z.infer<typeof extractedDataSchema>;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
