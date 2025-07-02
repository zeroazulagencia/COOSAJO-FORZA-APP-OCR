export interface DocumentStats {
  total: number;
  queued: number;
  processing: number;
  processed: number;
  failed: number;
}

export interface DocumentFilters {
  status: string;
  uploadDate: string;
}

export type DocumentStatus = 'queued' | 'processing' | 'processed' | 'failed';

export interface UploadProgress {
  currentFile: number;
  totalFiles: number;
  percentage: number;
  isUploading: boolean;
}
