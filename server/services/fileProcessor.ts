import fs from 'fs/promises';
import path from 'path';
import { storage } from '../storage';
import { extractDataFromImage } from './openai';
import type { ExtractedData } from '@shared/schema';

export async function processDocument(documentId: number): Promise<void> {
  try {
    // Update status to processing
    await storage.updateDocument(documentId, { status: 'processing' });
    
    const document = await storage.getDocument(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const startTime = Date.now();
    
    // Read the file and convert to base64
    const fileBuffer = await fs.readFile(document.filePath);
    const base64Image = fileBuffer.toString('base64');
    
    // Extract data using OpenAI
    const extractedData = await extractDataFromImage(base64Image);
    
    // Calculate average confidence
    const confidenceValues = Object.values(extractedData.confidence);
    const avgConfidence = confidenceValues.length > 0 
      ? Math.round(confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length)
      : 0;
    
    const processingTime = Date.now() - startTime;
    
    // Update document with results
    await storage.updateDocument(documentId, {
      status: 'processed',
      extractedData,
      processingTime,
      confidence: avgConfidence,
      errorMessage: null,
    });
    
  } catch (error) {
    console.error(`Error processing document ${documentId}:`, error);
    
    // Update document with error
    await storage.updateDocument(documentId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
}

export async function ensureUploadsDir(): Promise<string> {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  try {
    await fs.access(uploadsDir);
  } catch {
    await fs.mkdir(uploadsDir, { recursive: true });
  }
  return uploadsDir;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase().slice(1);
}
