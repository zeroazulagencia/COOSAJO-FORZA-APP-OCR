import { documents, type Document, type InsertDocument, type UpdateDocument } from "@shared/schema";

export interface IStorage {
  // Documents
  getDocument(id: number): Promise<Document | undefined>;
  getDocuments(filters?: { status?: string; uploadDate?: string }): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, updates: UpdateDocument): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;
  getDocumentStats(): Promise<{
    total: number;
    queued: number;
    processing: number;
    processed: number;
    failed: number;
  }>;
}

export class MemStorage implements IStorage {
  private documents: Map<number, Document>;
  private currentDocumentId: number;

  constructor() {
    this.documents = new Map();
    this.currentDocumentId = 1;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getDocuments(filters?: { status?: string; uploadDate?: string }): Promise<Document[]> {
    let docs = Array.from(this.documents.values());
    
    if (filters?.status && filters.status !== 'all') {
      docs = docs.filter(doc => doc.status === filters.status);
    }
    
    if (filters?.uploadDate) {
      const filterDate = new Date(filters.uploadDate);
      docs = docs.filter(doc => {
        const docDate = new Date(doc.uploadedAt);
        return docDate.toDateString() === filterDate.toDateString();
      });
    }
    
    return docs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.currentDocumentId++;
    const document: Document = {
      ...insertDocument,
      id,
      uploadedAt: new Date(),
      processedAt: null,
    };
    this.documents.set(id, document);
    return document;
  }

  async updateDocument(id: number, updates: UpdateDocument): Promise<Document | undefined> {
    const existing = this.documents.get(id);
    if (!existing) return undefined;
    
    const updated: Document = {
      ...existing,
      ...updates,
      ...(updates.status === 'processed' && !existing.processedAt ? { processedAt: new Date() } : {}),
    };
    
    this.documents.set(id, updated);
    return updated;
  }

  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }

  async getDocumentStats(): Promise<{
    total: number;
    queued: number;
    processing: number;
    processed: number;
    failed: number;
  }> {
    const docs = Array.from(this.documents.values());
    return {
      total: docs.length,
      queued: docs.filter(d => d.status === 'queued').length,
      processing: docs.filter(d => d.status === 'processing').length,
      processed: docs.filter(d => d.status === 'processed').length,
      failed: docs.filter(d => d.status === 'failed').length,
    };
  }
}

export const storage = new MemStorage();
