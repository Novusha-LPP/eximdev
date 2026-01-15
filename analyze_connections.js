const fs = require('fs');

try {
    const data = fs.readFileSync('connection_stats.json', 'utf8');
    const json = JSON.parse(data);

    const ops = json.activeApplicationOps || [];
    console.log(`Total Active Ops Recorded: ${ops.length}`);

    const ipCounts = {};
    const appNameCounts = {};

    ops.forEach(op => {
        let ip = 'Unknown';
        if (op.client) {
            ip = op.client.split(':')[0]; // Remove port
        }
        ipCounts[ip] = (ipCounts[ip] || 0) + 1;

        const appName = op.appName || 'Unknown (No appName sent)';
        appNameCounts[appName] = (appNameCounts[appName] || 0) + 1;
    });

    console.log('\n--- Client IP Distribution (Active Ops) ---');
    Object.entries(ipCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([ip, count]) => console.log(`${ip}: ${count}`));

    console.log('\n--- App Name Distribution (Active Ops) ---');
    Object.entries(appNameCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([name, count]) => console.log(`${name}: ${count}`));

} catch (err) {
    console.error(err);
}
