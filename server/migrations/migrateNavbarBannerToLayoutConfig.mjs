/**
 * Migration: Convert existing NavbarBanner documents into UILayoutConfig
 * Run with: node server/migrations/migrateNavbarBannerToLayoutConfig.mjs
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from server/.env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import NavbarBanner from "../model/NavbarBanner.mjs";
import UILayoutConfig from "../model/UILayoutConfig.mjs";

const MONGODB_URI = process.env.DEV_MONGODB_URI || process.env.SERVER_MONGODB_URI || process.env.PROD_MONGODB_URI;

if (!MONGODB_URI) {
  console.error("No MongoDB URI found in environment. Set DEV_MONGODB_URI, SERVER_MONGODB_URI, or PROD_MONGODB_URI.");
  process.exit(1);
}

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
    });
    console.log("Connected to MongoDB");

    const banners = await NavbarBanner.find().lean();
    console.log(`Found ${banners.length} navbar banner(s) to migrate`);

    for (const banner of banners) {
      const existing = await UILayoutConfig.findOne({ name: "Migrated Banner Theme" }).lean();
      if (existing) {
        console.log("Migration already completed. Skipping.");
        break;
      }

      const config = new UILayoutConfig({
        name: "Migrated Banner Theme",
        isActive: banner.isActive || false,
        updatedBy: banner.updatedBy || null,
        appbar: {
          enabled: true,
          backgroundColor: "rgba(249, 250, 251, 0.3)",
          backgroundOpacity: 0.3,
          blurIntensity: 6,
          textColor: "#000000",
          shadow: "none",
          height: 64,
          borderBottom: "none",
          extraContent: [],
        },
        sidebar: {
          enabled: true,
          backgroundColor: "#111b21",
          iconColor: "#ffffff9f",
          activeItemColor: "#ffffff",
          hoverColor: "#ffffff",
          hoverBgColor: "rgba(255,255,255,0.08)",
          width: 60,
          mode: "icon-only",
          backgroundImage: "sidebar-bg.webp",
          glassEffect: false,
          borderRight: "none",
          itemSpacing: 0,
        },
        banner: {
          enabled: banner.isActive || false,
          text: banner.text || "",
          link: banner.link || "",
          textColor: banner.textColor || "#ffffff",
          backgroundColor: banner.backgroundColor || "linear-gradient(90deg, #1e3c72 0%, #2a5298 100%)",
          height: banner.height || 36,
          animationType: banner.animationType || "none",
          displayMode: banner.displayMode || "top-bar",
          opacity: banner.opacity !== undefined ? banner.opacity : 1.0,
          closable: banner.closable !== undefined ? banner.closable : true,
          customCss: banner.customCss || "",
          startDate: banner.startDate || null,
          endDate: banner.endDate || null,
        },
      });

      await config.save();
      console.log(`Migrated banner: ${banner._id} -> UILayoutConfig: ${config._id}`);
    }

    console.log("Migration complete!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
