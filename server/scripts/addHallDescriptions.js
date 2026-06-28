import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import dns from 'dns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const descriptions = {
    'Pool Party Area': 'Stunning outdoor pool party venue surrounded by tropical palm trees. Features a swim-up bar, sunken lounge seating, built-in BBQ station, and underwater LED lighting. Includes dedicated changing rooms, outdoor showers, and an anti-slip sun deck. Perfect for daytime gatherings and lively evening celebrations under the stars.'
};

async function run() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) throw new Error('MONGO_URI not found');
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    const collection = mongoose.connection.db.collection('weddingHalls');
    
    for (const [hallName, description] of Object.entries(descriptions)) {
        const result = await collection.updateOne(
            { hallName },
            { $set: { description } }
        );
        console.log(`${hallName}: ${result.modifiedCount ? 'Updated' : (result.matchedCount ? 'Already set' : 'Not found')}`);
    }
    
    await mongoose.disconnect();
    console.log('Done!');
}

run().catch(console.error);
