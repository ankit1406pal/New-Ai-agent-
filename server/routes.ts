import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAssetSchema } from "@shared/schema";
import * as XLSX from 'xlsx';
import { z } from 'zod';

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all assets
  app.get("/api/assets", async (_req, res) => {
    try {
      const assets = await storage.getAssets();
      res.json(assets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch assets" });
    }
  });

  // Get single asset by ID
  app.get("/api/assets/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const asset = await storage.getAsset(id);
      
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      
      res.json(asset);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch asset" });
    }
  });

  // Check for duplicates
  app.post("/api/assets/check-duplicates", async (req, res) => {
    try {
      const validatedData = insertAssetSchema.parse({
        ...req.body,
        date: new Date(req.body.date),
      });
      
      const duplicateCheck = await storage.checkDuplicates(validatedData);
      res.json(duplicateCheck);
    } catch (error) {
      console.error("Error checking duplicates:", error);
      res.status(400).json({ error: "Invalid asset data" });
    }
  });

  // Create new asset
  app.post("/api/assets", async (req, res) => {
    try {
      const validatedData = insertAssetSchema.parse({
        ...req.body,
        date: new Date(req.body.date),
      });
      
      const asset = await storage.createAsset(validatedData);
      res.status(201).json(asset);
    } catch (error) {
      console.error("Error creating asset:", error);
      res.status(400).json({ error: "Invalid asset data" });
    }
  });

  // Update entire asset
  app.put("/api/assets/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertAssetSchema.parse({
        ...req.body,
        date: new Date(req.body.date),
      });
      
      const updatedAsset = await storage.updateAsset(id, validatedData);
      
      if (!updatedAsset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      
      res.json(updatedAsset);
    } catch (error) {
      console.error("Error updating asset:", error);
      res.status(400).json({ error: "Invalid asset data" });
    }
  });

  // Update only the status (for QR code scanning)
  app.patch("/api/assets/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      // Validate status
      const statusSchema = z.enum(["Pending", "Approved", "In Process", "Completed"]);
      const validatedStatus = statusSchema.parse(status);
      
      const updatedAsset = await storage.updateAssetStatus(id, validatedStatus);
      
      if (!updatedAsset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      
      res.json(updatedAsset);
    } catch (error) {
      console.error("Error updating asset status:", error);
      res.status(400).json({ error: "Invalid status value" });
    }
  });

  // Delete asset
  app.delete("/api/assets/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteAsset(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Asset not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting asset:", error);
      res.status(500).json({ error: "Failed to delete asset" });
    }
  });

  // Export assets to Excel with full audit log
  app.get("/api/assets/export/excel", async (_req, res) => {
    try {
      // Get ALL assets including deleted ones for full audit trail
      const allAssets = await storage.getAllAssets();
      
      // Transform assets for Excel with audit information
      const excelData = allAssets.map(asset => ({
        'ID': asset.id,
        'PC Name': asset.pcName,
        'Employee Number': asset.employeeNumber,
        'Username': asset.username,
        'Serial Number': asset.serialNumber,
        'MAC Address': asset.macAddress,
        'Buyback Status': asset.buybackStatus,
        'Date': asset.date.toISOString().split('T')[0],
        'Created At': asset.createdAt.toISOString(),
        'Updated At': asset.updatedAt.toISOString(),
        'Status of Entries & Assets': asset.statusLog,
      }));

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Assets");

      // Set column widths for better readability
      ws['!cols'] = [
        { wch: 36 }, // ID
        { wch: 20 }, // PC Name
        { wch: 15 }, // Employee Number
        { wch: 15 }, // Username
        { wch: 20 }, // Serial Number
        { wch: 20 }, // MAC Address
        { wch: 15 }, // Buyback Status
        { wch: 12 }, // Date
        { wch: 20 }, // Created At
        { wch: 20 }, // Updated At
        { wch: 25 }, // Status of Entries & Assets
      ];

      // Apply red formatting to deleted entries
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const statusCell = XLSX.utils.encode_cell({ r: R, c: 10 }); // Column K (Status of Entries & Assets)
        if (ws[statusCell] && ws[statusCell].v === 'Deleted') {
          // Apply red font color to the entire row
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws[cellAddress]) continue;
            if (!ws[cellAddress].s) ws[cellAddress].s = {};
            ws[cellAddress].s.font = { color: { rgb: "FF0000" } };
          }
        }
      }

      // Generate buffer
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true });

      // Set headers for download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=assets-audit-${new Date().toISOString().split('T')[0]}.xlsx`);
      
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      res.status(500).json({ error: "Failed to export assets" });
    }
  });


  const httpServer = createServer(app);

  return httpServer;
}
