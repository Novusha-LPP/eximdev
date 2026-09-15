import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '/home/aiserver/eximdev/server/.env' });

const uri = process.env.PROD_MONGODB_URI;

async function benchmark() {
  console.log('⚡ Connecting to MongoDB Atlas...');
  const t0 = Date.now();
  const conn = await mongoose.createConnection(uri, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 15000,
  }).asPromise();
  console.log(`✅ Connected in ${Date.now() - t0}ms\n`);

  // 1. PING LATENCY
  const pingStart = Date.now();
  await conn.db.command({ ping: 1 });
  const pingLatency = Date.now() - pingStart;
  console.log(`🏓 Atlas Network Ping Latency: ${pingLatency}ms`);

  // 2. EXIM.JOBS: type_of_b_e query (Was taking 2,547 ms before!)
  console.log('\n--- 1. Testing [exim.jobs] type_of_b_e Query ---');
  const jobsCol = conn.db.collection('jobs');
  const tJobs1 = Date.now();
  const inBondExplain = await jobsCol.find({ type_of_b_e: 'In-Bond' }).limit(10).explain('executionStats');
  const tJobsDuration = Date.now() - tJobs1;
  const stats = inBondExplain.executionStats;
  console.log(`⏱️  Execution Time: ${stats.executionTimeMillis}ms (Roundtrip: ${tJobsDuration}ms)`);
  console.log(`📄 Docs Examined: ${stats.totalDocsExamined}`);
  console.log(`🎯 Docs Returned: ${stats.nReturned}`);
  console.log(`🔍 Index Used: ${inBondExplain.queryPlanner.winningPlan.inputStage?.indexName || inBondExplain.queryPlanner.winningPlan.indexName || 'COLLSCAN'}`);

  // 3. EXPORT.EXPORTJOBS: charges query (Was taking 3,590 ms before!)
  console.log('\n--- 2. Testing [export.exportjobs] charges Query ---');
  const exportDb = conn.useDb('export');
  const exportCol = exportDb.collection('exportjobs');
  const tExp1 = Date.now();
  const expExplain = await exportCol.find({ isGeneralJob: true, year: '26-27' }).limit(10).explain('executionStats');
  const tExpDuration = Date.now() - tExp1;
  const expStats = expExplain.executionStats;
  console.log(`⏱️  Execution Time: ${expStats.executionTimeMillis}ms (Roundtrip: ${tExpDuration}ms)`);
  console.log(`📄 Docs Examined: ${expStats.totalDocsExamined}`);
  console.log(`🎯 Docs Returned: ${expStats.nReturned}`);
  console.log(`🔍 Index Used: ${expExplain.queryPlanner.winningPlan.inputStage?.indexName || expExplain.queryPlanner.winningPlan.indexName || 'COLLSCAN'}`);

  // 4. EXIM.JOB_LOGS: job_no query (Was scanning 6,974 docs before!)
  console.log('\n--- 3. Testing [exim.job_logs] job_no Query ---');
  const jobLogsCol = conn.db.collection('job_logs');
  const tLogs1 = Date.now();
  const sampleLog = await jobLogsCol.findOne({}, { projection: { job_no: 1 } });
  if (sampleLog?.job_no) {
    const logsExplain = await jobLogsCol.find({ job_no: sampleLog.job_no }).explain('executionStats');
    const logsStats = logsExplain.executionStats;
    console.log(`⏱️  Execution Time: ${logsStats.executionTimeMillis}ms (Roundtrip: ${Date.now() - tLogs1}ms)`);
    console.log(`📄 Docs Examined: ${logsStats.totalDocsExamined}`);
    console.log(`🎯 Docs Returned: ${logsStats.nReturned}`);
    console.log(`🔍 Index Used: ${logsExplain.queryPlanner.winningPlan.inputStage?.indexName || logsExplain.queryPlanner.winningPlan.indexName || 'COLLSCAN'}`);
  }

  await conn.close();
  console.log('\n🏁 Benchmark finished!');
}

benchmark().catch(console.error);
