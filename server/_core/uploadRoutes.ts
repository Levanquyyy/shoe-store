import type { Express, Request, Response } from "express";
import { uploadToCloudinary } from "../cloudinary";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

export function registerUploadRoutes(app: Express) {
  app.post("/api/upload", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }

      // Validate file type
      if (!req.file.mimetype.startsWith("image/")) {
        res.status(400).json({ error: "Only image files are allowed" });
        return;
      }

      // Validate file size (5MB max)
      if (req.file.size > 5 * 1024 * 1024) {
        res.status(400).json({ error: "File size must be less than 5MB" });
        return;
      }

      // Upload to Cloudinary
      const result = await uploadToCloudinary(req.file.buffer, req.file.originalname);

      res.json({
        url: result.secure_url,
        publicId: result.public_id,
      });
    } catch (error) {
      console.error("[Upload] Error:", error);
      res.status(500).json({ error: "Upload failed" });
    }
  });
}
