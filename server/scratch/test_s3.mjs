import dotenv from 'dotenv';
dotenv.config({ path: '/home/aiserver/eximdev/server/.env' });
import mongoose from 'mongoose';
import { S3Client, DeleteObjectCommand, HeadBucketCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.REACT_APP_AWS_REGION,
  credentials: {
    accessKeyId: process.env.REACT_APP_ACCESS_KEY,
    secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY,
  },
});

console.log('Testing S3 credentials...');
try {
  const headRes = await s3.send(new HeadBucketCommand({ Bucket: process.env.REACT_APP_S3_BUCKET }));
  console.log('HeadBucket success:', headRes);
} catch (err) {
  console.error('HeadBucket error:', err.name, err.message, err.$metadata);
}

try {
  const listRes = await s3.send(new ListObjectsV2Command({ Bucket: process.env.REACT_APP_S3_BUCKET, MaxKeys: 5 }));
  console.log('ListObjects success, count:', listRes.KeyCount, listRes.Contents?.map(c => c.Key));
} catch (err) {
  console.error('ListObjects error:', err.name, err.message, err.$metadata);
}

const uri = process.env.DEV_MONGODB_URI || process.env.MONGODB_URI;
await mongoose.connect(uri);
const db = mongoose.connection.db;

const sampleJob = await db.collection('jobs').findOne({
  $or: [
    { checklist: { $exists: true, $type: 'array', $ne: [] } },
    { processed_be_attachment: { $exists: true, $type: 'array', $ne: [] } },
    { ooc_copies: { $exists: true, $type: 'array', $ne: [] } }
  ]
}, { projection: { checklist: 1, processed_be_attachment: 1, ooc_copies: 1, gate_pass_copies: 1, do_copies: 1, job_no: 1 } });

console.log('Sample job files:', JSON.stringify(sampleJob, null, 2));
await mongoose.disconnect();
