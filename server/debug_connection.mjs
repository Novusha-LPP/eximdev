
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

dotenv.config();

const uri = process.env.NODE_ENV === "production"
    ? process.env.PROD_MONGODB_URI
    : process.env.NODE_ENV === "server"
    ? process.env.SERVER_MONGODB_URI
    : process.env.DEV_MONGODB_URI;

console.log('Testing URI (first 20 chars):', uri.substring(0, 20) + '...');

async function testMongoose() {
    console.log('Testing Mongoose connection...');
    try {
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000
        });
        console.log('✅ Mongoose connected successfully!');
        await mongoose.connection.close();
    } catch (err) {
        console.error('❌ Mongoose connection failed:', err);
    }
}

async function testMongoDriver() {
    console.log('Testing MongoDB Driver connection...');
    try {
        const client = new MongoClient(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
             serverSelectionTimeoutMS: 5000
        });
        await client.connect();
        console.log('✅ MongoDB Driver connected successfully!');
        await client.close();
    } catch (err) {
        console.error('❌ MongoDB Driver connection failed:', err);
    }
}

(async () => {
    await testMongoose();
    await testMongoDriver();
})();
