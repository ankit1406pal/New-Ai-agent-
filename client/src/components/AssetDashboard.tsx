import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, Download, PackageOpen, Trash2, Pencil, FileDown, AlertTriangle } from "lucide-react";
import StatusBadge from "./StatusBadge";
import type { InsertAsset } from "@shared/schema";

interface AssetWithId extends InsertAsset {
  id: string;
}

interface AssetDashboardProps {
  assets: AssetWithId[];
  onViewAsset?: (asset: AssetWithId) => void;
  onDownloadQR?: (asset: AssetWithId) => void;
  onEditAsset?: (asset: AssetWithId) => void;
  onDeleteAsset?: (asset: AssetWithId) => void;
  onExportExcel?: () => void;
}

export default function AssetDashboard({ 
  assets, 
  onViewAsset, 
  onDownloadQR, 
  onEditAsset, 
  onDeleteAsset,
  onExportExcel
}: AssetDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Enhanced duplicate detection for all fields
  const duplicateData = useMemo(() => {
    const serialNumbers = new Map<string, number>();
    const macAddresses = new Map<string, number>();
    const pcNames = new Map<string, number>();
    const employeeNumbers = new Map<string, number>();
    const usernames = new Map<string, number>();

    assets.forEach((asset) => {
      serialNumbers.set(asset.serialNumber, (serialNumbers.get(asset.serialNumber) || 0) + 1);
      macAddresses.set(asset.macAddress, (macAddresses.get(asset.macAddress) || 0) + 1);
      pcNames.set(asset.pcName, (pcNames.get(asset.pcName) || 0) + 1);
      employeeNumbers.set(asset.employeeNumber, (employeeNumbers.get(asset.employeeNumber) || 0) + 1);
      usernames.set(asset.username, (usernames.get(asset.username) || 0) + 1);
    });

    return {
      serialNumbers: new Set(Array.from(serialNumbers.entries()).filter(([, count]) => count > 1).map(([val]) => val)),
      macAddresses: new Set(Array.from(macAddresses.entries()).filter(([, count]) => count > 1).map(([val]) => val)),
      pcNames: new Set(Array.from(pcNames.entries()).filter(([, count]) => count > 1).map(([val]) => val)),
      employeeNumbers: new Set(Array.from(employeeNumbers.entries()).filter(([, count]) => count > 1).map(([val]) => val)),
      usernames: new Set(Array.from(usernames.entries()).filter(([, count]) => count > 1).map(([val]) => val)),
    };
  }, [assets]);

  const getDuplicateFields = (asset: AssetWithId): string[] => {
    const duplicates: string[] = [];
    if (duplicateData.serialNumbers.has(asset.serialNumber)) duplicates.push('Serial Number');
    if (duplicateData.macAddresses.has(asset.macAddress)) duplicates.push('MAC Address');
    if (duplicateData.pcNames.has(asset.pcName)) duplicates.push('PC Name');
    if (duplicateData.employeeNumbers.has(asset.employeeNumber)) duplicates.push('Employee Number');
    if (duplicateData.usernames.has(asset.username)) duplicates.push('Username');
    return duplicates;
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.pcName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.employeeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.macAddress.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || asset.buybackStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusOptions = ["All", "Pending", "Approved", "In Process", "Completed"];

  const totalDuplicates = assets.filter(asset => getDuplicateFields(asset).length > 0).length;

  return (
    <Card data-testid="card-asset-dashboard">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl">Asset Dashboard</CardTitle>
            <CardDescription>
              Track all assets in the buyback process
              {totalDuplicates > 0 && (
                <span className="text-destructive font-semibold ml-2">
                  • {totalDuplicates} duplicate{totalDuplicates > 1 ? 's' : ''} detected
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {onExportExcel && (
              <Button
                variant="outline"
                onClick={onExportExcel}
                data-testid="button-export-excel"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by PC name, employee, username, serial number, or MAC address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {statusOptions.map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              data-testid={`button-filter-${status.toLowerCase().replace(" ", "-")}`}
              className={statusFilter === status ? "toggle-elevate toggle-elevated" : ""}
            >
              {status}
            </Button>
          ))}
        </div>

        {filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <PackageOpen className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No assets found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || statusFilter !== "All"
                ? "Try adjusting your search or filters"
                : "Create your first asset entry to get started"}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PC Name</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>MAC Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.map((asset) => {
                    const duplicateFields = getDuplicateFields(asset);
                    const hasDuplicate = duplicateFields.length > 0;
                    return (
                      <TableRow
                        key={asset.id}
                        data-testid={`row-asset-${asset.id}`}
                        className={hasDuplicate ? "bg-destructive/10 hover:bg-destructive/20" : ""}
                      >
                        <TableCell className="font-medium">
                          {asset.pcName}
                          {duplicateData.pcNames.has(asset.pcName) && (
                            <Badge variant="destructive" className="ml-2 text-xs">DUP</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {asset.employeeNumber}
                          {duplicateData.employeeNumbers.has(asset.employeeNumber) && (
                            <Badge variant="destructive" className="ml-2 text-xs">DUP</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {asset.username}
                          {duplicateData.usernames.has(asset.username) && (
                            <Badge variant="destructive" className="ml-2 text-xs">DUP</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {asset.serialNumber}
                          {duplicateData.serialNumbers.has(asset.serialNumber) && (
                            <Badge variant="destructive" className="ml-2 text-xs">DUP</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {asset.macAddress}
                          {duplicateData.macAddresses.has(asset.macAddress) && (
                            <Badge variant="destructive" className="ml-2 text-xs">DUP</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={asset.buybackStatus} />
                        </TableCell>
                        <TableCell>
                          {new Date(asset.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {onViewAsset && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onViewAsset(asset)}
                                data-testid={`button-view-${asset.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            {onDownloadQR && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onDownloadQR(asset)}
                                data-testid={`button-download-${asset.id}`}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            {onEditAsset && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onEditAsset(asset)}
                                data-testid={`button-edit-${asset.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {onDeleteAsset && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onDeleteAsset(asset)}
                                data-testid={`button-delete-${asset.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden space-y-4">
              {filteredAssets.map((asset) => {
                const duplicateFields = getDuplicateFields(asset);
                const hasDuplicate = duplicateFields.length > 0;
                return (
                  <Card
                    key={asset.id}
                    data-testid={`card-asset-${asset.id}`}
                    className={hasDuplicate ? "border-destructive" : ""}
                  >
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold">{asset.pcName}</div>
                            <div className="text-sm text-muted-foreground">
                              {asset.employeeNumber}
                            </div>
                          </div>
                          <StatusBadge status={asset.buybackStatus} />
                        </div>
                        {hasDuplicate && (
                          <div className="flex items-center gap-2 text-xs text-destructive font-semibold bg-destructive/10 px-2 py-1.5 rounded">
                            <AlertTriangle className="h-4 w-4" />
                            <span>Duplicate: {duplicateFields.join(', ')}</span>
                          </div>
                        )}
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Username:</span>
                            <span>{asset.username}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Serial:</span>
                            <span className="font-mono">{asset.serialNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">MAC:</span>
                            <span className="font-mono">{asset.macAddress}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Date:</span>
                            <span>{new Date(asset.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2 flex-wrap">
                          {onViewAsset && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onViewAsset(asset)}
                              className="flex-1"
                              data-testid={`button-view-mobile-${asset.id}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          )}
                          {onDownloadQR && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onDownloadQR(asset)}
                              className="flex-1"
                              data-testid={`button-download-mobile-${asset.id}`}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              QR
                            </Button>
                          )}
                          {onEditAsset && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onEditAsset(asset)}
                              className="flex-1"
                              data-testid={`button-edit-mobile-${asset.id}`}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          )}
                          {onDeleteAsset && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onDeleteAsset(asset)}
                              className="flex-1"
                              data-testid={`button-delete-mobile-${asset.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
