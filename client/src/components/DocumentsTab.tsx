import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw, Eye, Download, FileText, Image } from "lucide-react";
import type { Document } from "@shared/schema";
import type { DocumentFilters } from "@/lib/types";

interface DocumentsTabProps {
  onViewDocument: (document: Document) => void;
  onRefreshData: () => void;
}

export default function DocumentsTab({ onViewDocument, onRefreshData }: DocumentsTabProps) {
  const { toast } = useToast();
  const [filters, setFilters] = useState<DocumentFilters>({
    status: "all",
    uploadDate: "",
  });

  const { data: documents = [], refetch } = useQuery<Document[]>({
    queryKey: ["/api/documents", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status !== "all" && filters.status !== "") {
        params.set("status", filters.status);
      }
      if (filters.uploadDate) {
        params.set("uploadDate", filters.uploadDate);
      }
      
      const response = await fetch(`/api/documents?${params}`);
      if (!response.ok) throw new Error("Failed to fetch documents");
      return response.json();
    },
    refetchInterval: 2000, // Refetch every 2 seconds to get updates
  });

  const handleRetryFailed = async () => {
    try {
      const response = await fetch("/api/documents/retry-failed", {
        method: "POST",
      });
      
      if (!response.ok) throw new Error("Failed to retry failed documents");
      
      const result = await response.json();
      toast({
        title: "Documentos reintentados",
        description: result.message,
      });
      
      refetch();
      onRefreshData();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron reintentar los documentos fallidos",
        variant: "destructive",
      });
    }
  };

  const handleRetryDocument = async (documentId: number) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/retry`, {
        method: "POST",
      });
      
      if (!response.ok) throw new Error("Failed to retry document");
      
      toast({
        title: "Documento reintentado",
        description: "El documento se ha puesto en cola para reprocesar",
      });
      
      refetch();
      onRefreshData();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo reintentar el documento",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      queued: { variant: "secondary" as const, icon: "clock", text: "En cola" },
      processing: { variant: "default" as const, icon: "sync-alt", text: "Procesando" },
      processed: { variant: "default" as const, icon: "check-circle", text: "Exitoso", className: "bg-green-100 text-green-800" },
      failed: { variant: "destructive" as const, icon: "exclamation-circle", text: "Error" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.queued;
    
    return (
      <Badge variant={config.variant} className={`flex items-center gap-1 w-fit ${config.className || ''}`}>
        <i className={`fas fa-${config.icon} text-xs ${status === 'processing' ? 'animate-spin' : ''}`}></i>
        {config.text}
      </Badge>
    );
  };

  const getFileIcon = (fileType: string) => {
    return fileType === 'pdf' ? FileText : Image;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('es-ES');
  };

  // Calculate progress for the progress bar
  const totalDocs = documents.length;
  const processedDocs = documents.filter(d => d.status === 'processed').length;
  const progressPercentage = totalDocs > 0 ? (processedDocs / totalDocs) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Documentos</h2>
          <p className="text-sm text-gray-600 mt-1">Lista de imágenes subidas y su estado</p>
        </div>
        <Button 
          onClick={handleRetryFailed}
          className="bg-amber-500 hover:bg-amber-600"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reprocesar fallidos
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Filtrar por estado:</label>
          <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="processed">Procesados</SelectItem>
              <SelectItem value="failed">Fallidos</SelectItem>
              <SelectItem value="processing">Procesando</SelectItem>
              <SelectItem value="queued">En cola</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Filtrar por fecha de carga:</label>
          <Input
            type="date"
            value={filters.uploadDate}
            onChange={(e) => setFilters(prev => ({ ...prev, uploadDate: e.target.value }))}
            className="w-48"
          />
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Estado de los documentos</span>
          <span className="text-sm text-gray-500">{processedDocs} ✓</span>
        </div>
        <Progress value={progressPercentage} className="w-full h-3" />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>
            • Exitosos: {documents.filter(d => d.status === 'processed').length} 
            • Procesando: {documents.filter(d => d.status === 'processing').length} 
            • Fallidos: {documents.filter(d => d.status === 'failed').length} 
            • Pendientes: {documents.filter(d => d.status === 'queued').length}
          </span>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tamaño</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subido</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((document) => {
                const FileIcon = getFileIcon(document.fileType);
                return (
                  <tr key={document.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {document.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileIcon className="text-gray-400 mr-3" size={16} />
                        <span className="text-sm font-medium text-gray-900">
                          {document.originalFilename}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatFileSize(document.fileSize)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="outline">
                        {document.fileType}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(document.uploadedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(document.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewDocument(document)}
                          disabled={document.status === 'processing' || document.status === 'queued'}
                          className="text-primary hover:text-blue-700"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </Button>
                        {document.status === 'failed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRetryDocument(document.id)}
                            className="text-amber-500 hover:text-amber-600"
                          >
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Reintentar
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {documents.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No se encontraron documentos
          </div>
        )}
      </div>
    </div>
  );
}
