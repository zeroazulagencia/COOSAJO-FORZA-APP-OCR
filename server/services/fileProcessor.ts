import fs from 'fs/promises';
import path from 'path';
import { storage } from '../storage';
import { extractDataFromImage } from './openai';
import type { ExtractedData } from '@shared/schema';
import { fromBuffer } from 'pdf2pic';
import sharp from 'sharp';

async function convertPdfToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
  try {
    const convert = fromBuffer(pdfBuffer, {
      density: 200, // Higher quality
      saveFilename: "page",
      savePath: "./temp", // temporary path
      format: "jpeg",
      width: 2000,
      height: 2800,
      quality: 90
    });

    const pages = await convert.bulk(-1, { responseType: "buffer" });
    return pages.map((page: any) => page.buffer);
  } catch (error) {
    console.error('Error converting PDF to images:', error);
    throw new Error('Failed to convert PDF to images');
  }
}

async function processImageBuffer(imageBuffer: Buffer): Promise<ExtractedData> {
  // Ensure the image is in the correct format and optimize it
  const processedBuffer = await sharp(imageBuffer)
    .jpeg({ quality: 90 })
    .toBuffer();
    
  const base64Image = processedBuffer.toString('base64');
  return await extractDataFromImage(base64Image);
}

export async function processDocument(documentId: number): Promise<void> {
  try {
    // Update status to processing
    await storage.updateDocument(documentId, { status: 'processing' });
    
    const document = await storage.getDocument(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const startTime = Date.now();
    
    // Read the file
    const fileBuffer = await fs.readFile(document.filePath);
    
    let allExtractedData: ExtractedData[] = [];
    
    if (document.fileType === 'pdf') {
      // Convert PDF to images and process each page
      console.log(`Converting PDF ${document.originalFilename} to images...`);
      const imageBuffers = await convertPdfToImages(fileBuffer);
      
      for (let i = 0; i < imageBuffers.length; i++) {
        console.log(`Processing page ${i + 1} of ${imageBuffers.length}...`);
        try {
          const extractedData = await processImageBuffer(imageBuffers[i]);
          allExtractedData.push(extractedData);
        } catch (pageError) {
          console.error(`Error processing page ${i + 1}:`, pageError);
          // Continue with other pages even if one fails
        }
      }
    } else {
      // Process single image
      console.log(`Processing image ${document.originalFilename}...`);
      const extractedData = await processImageBuffer(fileBuffer);
      allExtractedData.push(extractedData);
    }
    
    if (allExtractedData.length === 0) {
      throw new Error('No data could be extracted from any page');
    }
    
    // Combine data from all pages - prioritize found fields
    const combinedData: ExtractedData = {
      cif: undefined,
      loanNumber: undefined,
      account: undefined,
      fullName: undefined,
      dpi: undefined,
      loanAmount: undefined,
      fieldsFound: [],
      fieldsNotFound: [],
      confidence: {}
    };
    
    // Merge data from all pages, keeping the best confidence for each field
    for (const pageData of allExtractedData) {
      for (const field of ['cif', 'loanNumber', 'account', 'fullName', 'dpi', 'loanAmount']) {
        if (pageData[field as keyof ExtractedData] && 
            (!combinedData[field as keyof ExtractedData] || 
             (pageData.confidence?.[field] || 0) > (combinedData.confidence?.[field] || 0))) {
          (combinedData as any)[field] = pageData[field as keyof ExtractedData];
          if (combinedData.confidence) {
            combinedData.confidence[field] = pageData.confidence?.[field] || 0;
          }
        }
      }
    }
    
    // Update fields found/not found based on final result
    for (const field of ['cif', 'loanNumber', 'account', 'fullName', 'dpi', 'loanAmount']) {
      if (combinedData[field as keyof ExtractedData]) {
        combinedData.fieldsFound.push(field);
      } else {
        combinedData.fieldsNotFound.push(field);
      }
    }
    
    // Calculate average confidence
    const confidenceValues = combinedData.confidence ? Object.values(combinedData.confidence) : [];
    const avgConfidence = confidenceValues.length > 0 
      ? Math.round(confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length)
      : 0;
    
    const processingTime = Date.now() - startTime;
    
    // Update document with results
    await storage.updateDocument(documentId, {
      status: 'processed',
      extractedData: combinedData,
      processingTime,
      confidence: avgConfidence,
      errorMessage: null,
    });
    
    console.log(`Successfully processed document ${documentId} in ${processingTime}ms`);
    
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
