import fs from 'fs';
import path from 'path';

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file.endsWith('.js') || file.endsWith('.mjs')) {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        }
    });

    return arrayOfFiles;
}

const allFiles = getAllFiles('d:/eximdev/server/routes');
let changedCount = 0;

allFiles.forEach(file => {
    try {
        let content = fs.readFileSync(file, 'utf8');

        // Skip if not importing JobModel
        if (!content.includes('import JobModel from')) {
            return;
        }

        // Determine path to factory
        const normalizedFile = file.replace(/\\/g, '/');
        const routesBase = 'd:/eximdev/server/routes';
        const relativeToRoutes = normalizedFile.substring(routesBase.length + 1);
        const depth = relativeToRoutes.split('/').length - 1;
        const upDirs = '../'.repeat(depth + 1); // e.g. routes/a/b.js -> ../../model/

        const factoryImport = `import { getJobModel } from "${upDirs}model/jobModelFactory.mjs";`;

        content = content.replace(/import JobModel from\s+['"].*?jobModel(\.mjs)?['"];?/g, factoryImport);

        // Match standard express routes
        // like: async (req, res) => {
        // or: async (req,res,next)=>{
        // or: (req, res, next) => {
        content = content.replace(/\((.*?req.*?),\s*(res.*?)\)\s*=>\s*\{/g, (match, reqPart, resPart) => {
            // Find the exact word for req. Sometimes people use `request` or just `req`
            const matchReq = reqPart.match(/\b(req|request)\b/);
            const reqVar = matchReq ? matchReq[0] : 'req';
            return `${match}\n    const JobModel = getJobModel(${reqVar}.headers['x-branch'], ${reqVar}.headers['x-category']);\n`;
        });

        // Write back
        fs.writeFileSync(file, content, 'utf8');
        changedCount++;
        console.log(`Updated ${relativeToRoutes}`);
    } catch (err) {
        console.error(`Error processing ${file}: ${err.message}`);
    }
});

console.log(`Total files updated: ${changedCount}`);
