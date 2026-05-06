import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected');

    // Fix "Active" -> "active"
    const r1 = await mongoose.connection.db.collection('users').updateMany(
        { status: 'Active' },
        { $set: { status: 'active' } }
    );
    console.log('Fixed Active -> active:', r1.modifiedCount);

    // Fix "Inactive" -> "active" (re-enable staff so they can login)
    const r2 = await mongoose.connection.db.collection('users').updateMany(
        { status: 'Inactive' },
        { $set: { status: 'active' } }
    );
    console.log('Fixed Inactive -> active:', r2.modifiedCount);

    // Verify
    const users = await mongoose.connection.db.collection('users')
        .find({}, { projection: { email: 1, role: 1, status: 1 } })
        .toArray();
    console.log('\nAll users after fix:');
    users.forEach(u => console.log(`  ${u.email} | role: ${u.role} | status: ${u.status}`));

    process.exit(0);
};

run();
