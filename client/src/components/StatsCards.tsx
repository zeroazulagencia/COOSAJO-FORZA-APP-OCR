import { Card, CardContent } from "@/components/ui/card";
import { FileText, Clock, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import type { DocumentStats } from "@/lib/types";

interface StatsCardsProps {
  stats?: DocumentStats;
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Documentos Cargados",
      value: stats?.total || 0,
      subtitle: "Total de imágenes",
      icon: FileText,
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "En Cola",
      value: stats?.queued || 0,
      subtitle: "Esperando proceso",
      icon: Clock,
      bgColor: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      title: "Procesando",
      value: stats?.processing || 0,
      subtitle: "En procesamiento",
      icon: RefreshCw,
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
      spin: true,
    },
    {
      title: "Procesados",
      value: stats?.processed || 0,
      subtitle: "Exitosamente",
      icon: CheckCircle,
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      title: "Fallidos",
      value: stats?.failed || 0,
      subtitle: "Con error",
      icon: XCircle,
      bgColor: "bg-red-50",
      iconColor: "text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      {cards.map((card, index) => (
        <Card key={index} className="shadow-sm border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
                <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
              </div>
              <div className={`${card.bgColor} p-3 rounded-lg`}>
                <card.icon 
                  className={`${card.iconColor} text-xl ${card.spin ? 'animate-spin' : ''}`}
                  size={24}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
