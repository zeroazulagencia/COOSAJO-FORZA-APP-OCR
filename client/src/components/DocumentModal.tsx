import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZoomIn, Download, FolderOutput, X } from "lucide-react";
import type { Document } from "@shared/schema";

interface DocumentModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DocumentModal({ document, isOpen, onClose }: DocumentModalProps) {
  if (!document) return null;

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      queued: { variant: "secondary" as const, icon: "clock", text: "En cola" },
      processing: { variant: "default" as const, icon: "sync-alt", text: "Procesando" },
      processed: { variant: "default" as const, icon: "check-circle", text: "Procesado exitosamente", className: "bg-green-100 text-green-800" },
      failed: { variant: "destructive" as const, icon: "exclamation-circle", text: "Error en procesamiento" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.queued;
    
    return (
      <Badge variant={config.variant} className={`flex items-center gap-1 w-fit ${config.className || ''}`}>
        <i className={`fas fa-${config.icon} text-xs ${status === 'processing' ? 'animate-spin' : ''}`}></i>
        {config.text}
      </Badge>
    );
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const extractedData = document.extractedData as any;
  const fields = [
    { key: 'cif', label: 'CIF' },
    { key: 'loanNumber', label: 'Nro. Préstamo' },
    { key: 'account', label: 'Cuenta' },
    { key: 'fullName', label: 'Nombre Apellido' },
    { key: 'dpi', label: 'Nro. DPI' },
    { key: 'loanAmount', label: 'Monto del préstamo' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="text-lg font-medium text-gray-900">
              Detalle del Documento
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Document Image */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Imagen del Documento</h4>
            <div className="relative">
              <img 
                src={`/api/files/${document.filename}`}
                alt={document.originalFilename}
                className="w-full rounded-lg border border-gray-200"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://via.placeholder.com/400x300?text=Imagen+no+disponible";
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                <ZoomIn className="w-4 h-4 mr-2" />
                Ampliar
              </Button>
              <Button variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Descargar
              </Button>
            </div>
          </div>

          {/* Extracted Data */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-gray-900">Datos Extraídos</h4>
              {getStatusBadge(document.status)}
            </div>

            {document.status === 'processed' && extractedData ? (
              <div className="space-y-4">
                {fields.map((field) => {
                  const value = extractedData[field.key];
                  const confidence = extractedData.confidence?.[field.key];
                  const isFound = extractedData.fieldsFound?.includes(field.key) || !!value;
                  
                  return (
                    <div key={field.key} className="bg-gray-50 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                      </label>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-900">
                          {value || 'No encontrado'}
                        </span>
                        <Badge
                          variant={isFound ? "default" : "secondary"}
                          className={isFound ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"}
                        >
                          {isFound ? 'Encontrado' : 'No encontrado'}
                          {confidence && ` (${confidence}%)`}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : document.status === 'failed' ? (
              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <i className="fas fa-exclamation-triangle text-red-600 mt-0.5"></i>
                  <div>
                    <h5 className="font-medium text-red-900">Error en el procesamiento</h5>
                    <p className="text-sm text-red-800 mt-1">
                      {document.errorMessage || 'Ocurrió un error desconocido durante el procesamiento'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <i className="fas fa-info-circle text-blue-600 mt-0.5"></i>
                  <div>
                    <h5 className="font-medium text-blue-900">
                      {document.status === 'processing' ? 'Procesando documento' : 'Documento en cola'}
                    </h5>
                    <p className="text-sm text-blue-800 mt-1">
                      {document.status === 'processing' 
                        ? 'El documento se está procesando, los datos se mostrarán cuando termine.'
                        : 'El documento está en cola para ser procesado.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Processing Info */}
            {document.status === 'processed' && (
              <div className="bg-blue-50 rounded-lg p-4 mt-6">
                <div className="flex items-start gap-3">
                  <i className="fas fa-info-circle text-blue-600 mt-0.5"></i>
                  <div>
                    <h5 className="font-medium text-blue-900">Información del procesamiento</h5>
                    <p className="text-sm text-blue-800 mt-1">
                      Procesado el {formatDate(document.processedAt)}<br/>
                      {document.processingTime && `Tiempo de procesamiento: ${(document.processingTime / 1000).toFixed(1)} segundos`}<br/>
                      {document.confidence && `Confianza promedio: ${document.confidence}%`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          {document.status === 'processed' && (
            <Button className="bg-primary hover:bg-blue-700">
              <FolderOutput className="w-4 h-4 mr-2" />
              Exportar datos
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
