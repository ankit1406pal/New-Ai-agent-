import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AssetDashboard from "@/components/AssetDashboard";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { InsertAsset, Asset } from "@shared/schema";

interface AssetWithId extends InsertAsset {
  id: string;
}

export default function DashboardPage() {
  const [selectedAsset, setSelectedAsset] = useState<AssetWithId | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: assets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/assets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({
        title: "Asset Deleted",
        description: "The asset has been removed from the system.",
      });
      if (selectedAsset) {
        setSelectedAsset(null);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete asset. Please try again.",
        variant: "destructive",
      });
    },
  });

  const assetsWithId: AssetWithId[] = assets.map((asset) => ({
    id: asset.id,
    pcName: asset.pcName,
    employeeNumber: asset.employeeNumber,
    username: asset.username,
    serialNumber: asset.serialNumber,
    macAddress: asset.macAddress,
    buybackStatus: asset.buybackStatus as "Pending" | "Approved" | "In Process" | "Completed",
    date: new Date(asset.date),
  }));

  const handleViewAsset = (asset: AssetWithId) => {
    setSelectedAsset(asset);
  };

  const handleDownloadQR = (asset: AssetWithId) => {
    setSelectedAsset(asset);
  };

  const handleEditAsset = (asset: AssetWithId) => {
    setLocation(`/edit/${asset.id}`);
  };

  const handleDeleteAsset = (asset: AssetWithId) => {
    if (confirm(`Are you sure you want to delete asset ${asset.pcName}?`)) {
      deleteAssetMutation.mutate(asset.id);
    }
  };

  const handleCloseQR = () => {
    setSelectedAsset(null);
  };

  const handleExportExcel = async () => {
    try {
      const response = await fetch('/api/assets/export/excel');
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assets-audit-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: "Full audit log exported to Excel file including all created, updated, and deleted assets.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export assets. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading assets...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {!selectedAsset ? (
        <AssetDashboard
          assets={assetsWithId}
          onViewAsset={handleViewAsset}
          onDownloadQR={handleDownloadQR}
          onEditAsset={handleEditAsset}
          onDeleteAsset={handleDeleteAsset}
          onExportExcel={handleExportExcel}
        />
      ) : (
        <QRCodeDisplay assetData={selectedAsset} onClose={handleCloseQR} />
      )}
    </div>
  );
}
