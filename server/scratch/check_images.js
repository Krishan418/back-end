import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dns.setServers(["8.8.8.8", "8.8.4.4"]);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MenuItemSchema = new mongoose.Schema({
  name: String,
  image: String
});

const MenuItem = mongoose.model('MenuItem', MenuItemSchema);

async function checkImages() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const items = await MenuItem.find({}, 'name image');
    
    console.log('--- Current Menu Item Images ---');
    items.forEach(item => {
      console.log(`${item.name}: ${item.image}`);
    });
    
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkImages();
