import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
dotenv.config({ path: path.join(__dirname, "../server/.env") });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI is missing in .env file");
  process.exit(1);
}

// Define backup directory
const BACKUP_DIR = path.join(__dirname, "../backups");

// Create backup directory if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Generate an archive file name with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const archivePath = path.join(BACKUP_DIR, `hotel-janro-db-backup-${timestamp}.gzip`);

console.log("⏳ Starting MongoDB database backup...");

// mongodump command targeting the Atlas cluster using the standard URI
const command = `mongodump --uri="${MONGO_URI}" --archive="${archivePath}" --gzip`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Backup Failed: ${error.message}`);
    return;
  }
  
  if (stderr) {
    // mongodump writes verbose progress output to stderr
    console.log(stderr);
  }

  console.log(`✅ Backup successfully created at: ${archivePath}`);

  // Optional: Clean up old backups (keep last 7 days)
  cleanOldBackups(BACKUP_DIR, 7);
});

// Helper to keep disk space clean by deleting older backups
function cleanOldBackups(dir, daysToKeep) {
  const files = fs.readdirSync(dir);
  const now = Date.now();
  const maxAge = daysToKeep * 24 * 60 * 60 * 1000;

  files.forEach((file) => {
    if (file.endsWith(".gzip")) {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtimeMs;
      
      if (age > maxAge) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Deleted old backup: ${file}`);
      }
    }
  });
}
