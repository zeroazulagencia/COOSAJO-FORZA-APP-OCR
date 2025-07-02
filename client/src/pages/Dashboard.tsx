import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import StatsCards from "@/components/StatsCards";
import UploadTab from "@/components/UploadTab";
import DocumentsTab from "@/components/DocumentsTab";
import DocumentModal from "@/components/DocumentModal";
import type { Document } from "@shared/schema";
import type { DocumentStats } from "@/lib/types";

export default function Dashboard() {
  const { toast } = useToast();
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: stats, refetch: refetchStats } = useQuery<DocumentStats>({
    queryKey: ["/api/stats"],
  });

  const handleExportToExcel = async () => {
    try {
      const response = await fetch("/api/export");
      if (!response.ok) throw new Error("Failed to export");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `documentos-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Exportación exitosa",
        description: "Los datos se han exportado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error en la exportación",
        description: "No se pudo exportar los datos",
        variant: "destructive",
      });
    }
  };

  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
    setIsModalOpen(true);
  };

  const handleRefreshData = () => {
    refetchStats();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                Monitoreo y gestión de procesamiento de imágenes
              </p>
            </div>
            <Button onClick={handleExportToExcel} className="bg-primary hover:bg-blue-600">
              <Download className="w-4 h-4 mr-2" />
              Exportar a Excel
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <StatsCards stats={stats} />

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <Tabs defaultValue="upload" className="w-full">
            <div className="border-b border-gray-200">
              <TabsList className="h-auto p-0 bg-transparent">
                <TabsTrigger
                  value="upload"
                  className="data-[state=active]:bg-blue-50 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-4 text-sm font-medium"
                >
                  <i className="fas fa-cloud-upload-alt mr-2"></i>
                  Subir Documentos
                </TabsTrigger>
                <TabsTrigger
                  value="view"
                  className="data-[state=active]:bg-blue-50 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-4 text-sm font-medium"
                >
                  <i className="fas fa-list mr-2"></i>
                  Ver Documentos
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="upload" className="p-8 m-0">
              <UploadTab onUploadComplete={handleRefreshData} />
            </TabsContent>

            <TabsContent value="view" className="p-8 m-0">
              <DocumentsTab 
                onViewDocument={handleViewDocument}
                onRefreshData={handleRefreshData}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Document Modal */}
      <DocumentModal
        document={selectedDocument}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDocument(null);
        }}
      />
    </div>
  );
}
