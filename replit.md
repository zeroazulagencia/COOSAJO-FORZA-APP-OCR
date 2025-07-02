# Document Processing System

## Overview

This is a full-stack document processing application built with React, Express, and Drizzle ORM. The system allows users to upload documents (PDFs and images), process them using OpenAI's GPT-4 for data extraction, and manage the extracted information through a clean dashboard interface.

## System Architecture

The application follows a modern full-stack architecture with clear separation between frontend and backend:

- **Frontend**: React with TypeScript, Vite for building, shadcn/ui components
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **File Processing**: OpenAI GPT-4 Vision API for document analysis
- **Styling**: Tailwind CSS with custom design system

## Key Components

### Frontend Architecture
- **Component Structure**: Built with reusable UI components using shadcn/ui
- **State Management**: React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **UI Framework**: Radix UI primitives with Tailwind CSS styling
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **API Layer**: RESTful Express.js server with middleware for logging and error handling
- **Data Layer**: Drizzle ORM with PostgreSQL for type-safe database operations
- **File Storage**: Local file system with multer for file upload handling
- **Processing Engine**: OpenAI integration for document data extraction

### Database Schema
The system uses a document-centric schema:

```typescript
documents {
  id: serial (primary key)
  filename: text
  originalFilename: text
  fileType: text (pdf/image)
  mimeType: text
  fileSize: integer
  filePath: text
  status: text (queued/processing/processed/failed)
  uploadedAt: timestamp
  processedAt: timestamp
  extractedData: jsonb (structured extracted fields)
  errorMessage: text
  processingTime: integer
  confidence: integer
}
```

## Data Flow

1. **File Upload**: Users drag/drop or select files through the upload interface
2. **Storage**: Files are stored locally with unique filenames and metadata in database
3. **Processing Queue**: Documents are queued for processing with status tracking
4. **AI Processing**: OpenAI GPT-4 Vision analyzes documents to extract specific fields (CIF, loan number, account, full name, DPI, loan amount)
5. **Result Storage**: Extracted data is stored as JSON with confidence scores
6. **Dashboard Display**: Processed documents appear in the dashboard with filterable views
7. **Export**: Users can export all processed data to Excel format

## External Dependencies

### Core Technologies
- **Drizzle ORM**: Type-safe database operations with PostgreSQL
- **OpenAI API**: GPT-4 Vision for document analysis and data extraction
- **Neon Database**: Serverless PostgreSQL hosting
- **Radix UI**: Unstyled, accessible UI primitives
- **Tailwind CSS**: Utility-first CSS framework

### Development Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Type safety across the entire stack
- **ESBuild**: Fast JavaScript bundler for production builds

### File Processing
- **Multer**: Multipart file upload handling
- **XLSX**: Excel file generation for data export
- **File System**: Local storage for uploaded documents

## Deployment Strategy

The application is configured for deployment on Replit with the following build process:

1. **Development**: `npm run dev` - Runs Vite dev server and Express server concurrently
2. **Production Build**: 
   - Frontend: Vite builds React app to `dist/public`
   - Backend: ESBuild bundles Express server to `dist/index.js`
3. **Database**: Uses Neon PostgreSQL with connection pooling
4. **Environment Variables**: 
   - `DATABASE_URL`: PostgreSQL connection string
   - `OPENAI_API_KEY`: OpenAI API authentication

The system uses memory-based storage as a fallback when database is not available, making it resilient for development and testing.

## Changelog

```
Changelog:
- July 02, 2025. Initial setup
- July 02, 2025. Completed PDF processing implementation:
  * Added pdf2pic for PDF to image conversion
  * Implemented page-by-page processing for multi-page PDFs
  * Enhanced data extraction to combine results from all pages
  * Added automatic refresh every 2 seconds for real-time updates
  * Successfully tested with 6-page PDF extracting all financial fields
  * System extracts: CIF, loan number, account, full name, DPI, loan amount
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```