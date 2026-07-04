    import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import dns from 'dns';
import Room from '../models/room.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Use Google DNS to resolve MongoDB Atlas SRV records
dns.setServers(['8.8.8.8', '8.8.4.4']);

const ROOMS = [
  {
    name: 'Standard Room',
    description: 'Comfortable and elegant, our Standard Room features a king-size bed, work desk, and modern amenities for a pleasant stay.',
    price: 5000,
    availableRooms: 6,
    totalRooms: 6,
    defaultGuests: 4,
    amenities: ['King-size bed', 'Work desk', 'WiFi', 'AC', 'TV'],
    image: 'https://images.unsplash.com/photo-1759223198981-661cadbbff36?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    isActive: true
  },
  {
    name: 'Family Suite',
    description: 'Designed for families, featuring two bedrooms, a play area, kid-friendly amenities, and connecting rooms.',
    price: 10000,
    availableRooms: 2,
    totalRooms: 2,
    defaultGuests: 4,
    amenities: ['Two bedrooms', 'Play area', 'Kid-friendly amenities', 'Connecting rooms', 'WiFi', 'AC'],
    image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    isActive: true
  },
  {
    name: 'Honeymoon Suite',
    description: 'A romantic escape with private pool, candlelit dining setup, rose petal turndown, and couples spa treatment.',
    price: 7500,
    availableRooms: 2,
    totalRooms: 2,
    defaultGuests: 2,
    amenities: ['Private pool', 'Candlelit dining', 'Rose petal turndown', 'Couples spa', 'WiFi', 'AC'],
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    isActive: true
  }
];

const seedRooms = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hotel_janro';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Hard reset — delete ALL existing room entries to clear any duplicates
    const deleted = await Room.deleteMany({});
    console.log(`Deleted ${deleted.deletedCount} existing room(s)`);

    // Insert fresh canonical rooms
    await Room.insertMany(ROOMS);
    console.log('Rooms seeded successfully:');
    ROOMS.forEach(r => console.log(`  - ${r.name}: ${r.availableRooms} rooms @ Rs.${r.price}`));

    process.exit(0);
  } catch (error) {
    console.error('Error seeding rooms:', error.message);
    process.exit(1);
  }
};

seedRooms();
