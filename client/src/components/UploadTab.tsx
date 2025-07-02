import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { CloudUpload, FileText, Check } from "lucide-react";
import type { UploadProgress } from "@/lib/types";

interface UploadTabProps {
  onUploadComplete: () => void;
}

export default function UploadTab({ onUploadComplete }: UploadTabProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    currentFile: 0,
    totalFiles: 0,
    percentage: 0,
    isUploading: false,
  });

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    uploadFiles(Array.from(files));
  };

  const uploadFiles = async (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    setUploadProgress({
      currentFile: 0,
      totalFiles: files.length,
      percentage: 0,
      isUploading: true,
    });

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload files');
      }

      const result = await response.json();
      
      setUploadProgress(prev => ({
        ...prev,
        percentage: 100,
        currentFile: files.length,
      }));

      toast({
        title: "Archivos subidos exitosamente",
        description: `${files.length} archivo(s) subido(s) y en cola para procesamiento`,
      });

      onUploadComplete();
      
      setTimeout(() => {
        setUploadProgress({
          currentFile: 0,
          totalFiles: 0,
          percentage: 0,
          isUploading: false,
        });
      }, 2000);

    } catch (error) {
      toast({
        title: "Error al subir archivos",
        description: "Hubo un problema al subir los archivos",
        variant: "destructive",
      });
      
      setUploadProgress({
        currentFile: 0,
        totalFiles: 0,
        percentage: 0,
        isUploading: false,
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const supportedFields = [
    "CIF",
    "Nro. Préstamo",
    "Cuenta",
    "Nombre Apellido",
    "Nro. DPI",
    "Monto del préstamo",
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Subir Documentos</h2>
        <p className="text-gray-600">
          Arrastra y suelta archivos PDF o imágenes, o haz clic para seleccionar
        </p>
      </div>

      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
          isDragOver
            ? "border-primary bg-blue-50"
            : "border-gray-300 hover:border-primary hover:bg-blue-50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="max-w-md mx-auto">
          <CloudUpload className="text-4xl text-gray-400 mb-4 mx-auto" size={64} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Seleccionar archivos</h3>
          <p className="text-sm text-gray-600 mb-4">PDF, JPG, PNG hasta 10MB cada uno</p>
          <Button className="bg-primary hover:bg-blue-600">
            Examinar archivos
          </Button>
          <p className="text-xs text-gray-500 mt-2">o arrastra y suelta aquí</p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {/* Upload Progress */}
      {uploadProgress.isUploading && (
        <div className="mt-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {uploadProgress.percentage === 100 ? "Completado" : "Subiendo archivos..."}
              </span>
              <span className="text-sm text-gray-500">
                {uploadProgress.currentFile} de {uploadProgress.totalFiles}
              </span>
            </div>
            <Progress value={uploadProgress.percentage} className="w-full" />
            {uploadProgress.percentage === 100 && (
              <div className="flex items-center justify-center mt-2 text-green-600">
                <Check className="w-4 h-4 mr-1" />
                <span className="text-sm">Archivos subidos correctamente</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Supported Fields Info */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h4 className="font-medium text-blue-900 mb-3">
          Campos que se extraerán automáticamente:
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-blue-800">
          {supportedFields.map((field, index) => (
            <div key={index} className="flex items-center gap-2">
              <Check className="w-4 h-4 text-blue-600" />
              {field}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
