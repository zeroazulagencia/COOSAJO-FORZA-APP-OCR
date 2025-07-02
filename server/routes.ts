import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { storage } from "./storage";
import { processDocument, ensureUploadsDir, getFileExtension } from "./services/fileProcessor";
import { insertDocumentSchema, updateDocumentSchema } from "@shared/schema";
import * as XLSX from 'xlsx';

// Configure multer for file uploads
const configureMulter = async () => {
  const uploadsDir = await ensureUploadsDir();
  
  return multer({
    storage: multer.diskStorage({
      destination: uploadsDir,
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
      }
    }),
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Tipo de archivo no permitido. Solo se permiten PDF, JPG y PNG.'));
      }
    },
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    }
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  const upload = await configureMulter();

  // Get document statistics
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getDocumentStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Error fetching statistics" });
    }
  });

  // Get all documents with optional filters
  app.get("/api/documents", async (req, res) => {
    try {
      const { status, uploadDate } = req.query;
      const filters: any = {};
      
      if (status && typeof status === 'string') {
        filters.status = status;
      }
      
      if (uploadDate && typeof uploadDate === 'string') {
        filters.uploadDate = uploadDate;
      }
      
      const documents = await storage.getDocuments(filters);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Error fetching documents" });
    }
  });

  // Get single document
  app.get("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      res.json(document);
    } catch (error) {
      res.status(500).json({ message: "Error fetching document" });
    }
  });

  // Upload documents
  app.post("/api/upload", upload.array('files'), async (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const uploadedDocuments = [];

      for (const file of req.files) {
        const documentData = {
          filename: file.filename,
          originalFilename: file.originalname,
          fileType: file.mimetype.startsWith('image/') ? 'image' : 'pdf',
          mimeType: file.mimetype,
          fileSize: file.size,
          filePath: file.path,
          status: 'queued' as const,
          extractedData: null,
          errorMessage: null,
          processingTime: null,
          confidence: null,
        };

        const validatedData = insertDocumentSchema.parse(documentData);
        const document = await storage.createDocument(validatedData);
        uploadedDocuments.push(document);

        // Start processing asynchronously
        processDocument(document.id).catch(error => {
          console.error(`Failed to process document ${document.id}:`, error);
        });
      }

      res.json({ 
        message: "Files uploaded successfully", 
        documents: uploadedDocuments 
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Error uploading files" 
      });
    }
  });

  // Retry processing a failed document
  app.post("/api/documents/:id/retry", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      if (document.status !== 'failed') {
        return res.status(400).json({ message: "Only failed documents can be retried" });
      }
      
      // Reset document status
      await storage.updateDocument(id, { 
        status: 'queued',
        errorMessage: null 
      });
      
      // Start processing
      processDocument(id).catch(error => {
        console.error(`Failed to retry processing document ${id}:`, error);
      });
      
      res.json({ message: "Document queued for retry" });
    } catch (error) {
      res.status(500).json({ message: "Error retrying document" });
    }
  });

  // Retry all failed documents
  app.post("/api/documents/retry-failed", async (req, res) => {
    try {
      const failedDocs = await storage.getDocuments({ status: 'failed' });
      
      for (const doc of failedDocs) {
        await storage.updateDocument(doc.id, { 
          status: 'queued',
          errorMessage: null 
        });
        
        processDocument(doc.id).catch(error => {
          console.error(`Failed to retry processing document ${doc.id}:`, error);
        });
      }
      
      res.json({ 
        message: `${failedDocs.length} documents queued for retry` 
      });
    } catch (error) {
      res.status(500).json({ message: "Error retrying failed documents" });
    }
  });

  // Export to Excel
  app.get("/api/export", async (req, res) => {
    try {
      const documents = await storage.getDocuments();
      const processedDocs = documents.filter(doc => doc.status === 'processed' && doc.extractedData);
      
      const excelData = processedDocs.map(doc => {
        const extractedData = doc.extractedData as any;
        return {
          'ID': doc.id,
          'Nombre Archivo': doc.originalFilename,
          'Fecha Subida': doc.uploadedAt?.toLocaleDateString('es-ES'),
          'Fecha Procesado': doc.processedAt?.toLocaleDateString('es-ES'),
          'CIF': extractedData?.cif || '',
          'Nro. Préstamo': extractedData?.loanNumber || '',
          'Cuenta': extractedData?.account || '',
          'Nombre Apellido': extractedData?.fullName || '',
          'Nro. DPI': extractedData?.dpi || '',
          'Monto del Préstamo': extractedData?.loanAmount || '',
          'Confianza (%)': doc.confidence || 0,
          'Tiempo Procesamiento (ms)': doc.processingTime || 0,
        };
      });
      
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Documentos Procesados');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=documentos-${new Date().toISOString().split('T')[0]}.xlsx`);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ message: "Error exporting data" });
    }
  });

  // Serve uploaded files
  app.get("/api/files/:filename", async (req, res) => {
    try {
      const uploadsDir = await ensureUploadsDir();
      const filePath = path.join(uploadsDir, req.params.filename);
      res.sendFile(filePath);
    } catch (error) {
      res.status(404).json({ message: "File not found" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
