import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://kavindukrishan2002418_db_user:K12345678@cluster0.lyijvbw.mongodb.net/hotel_db?retryWrites=true&w=majority';

async function fixStandardRooms() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected!');

    const db = mongoose.connection.db;
    const roomsCollection = db.collection('rooms');

    // Update Standard Room -> 6 rooms total (Room 1-6)
    const result = await roomsCollection.updateOne(
      { name: { $regex: /^standard room$/i } },
      {
        $set: {
          totalRooms: 6,
          availableRooms: 6,
          allRoomNumbers: ['Room 1', 'Room 2', 'Room 3', 'Room 4', 'Room 5', 'Room 6']
        }
      }
    );

    console.log('Standard Room updated:', result.modifiedCount, 'document(s) modified');

    // Show current state
    const rooms = await roomsCollection.find({}).toArray();
    rooms.forEach(r => {
      console.log(`- ${r.name}: total=${r.totalRooms}, available=${r.availableRooms}, rooms=${JSON.stringify(r.allRoomNumbers)}`);
    });

    console.log('\nDone! Standard Room now has 6 rooms (Room 1-4 Non-AC, Room 5-6 AC)');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

fixStandardRooms();
