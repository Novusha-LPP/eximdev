
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '../../app.mjs';
import KPITemplate from '../../model/kpi/kpiTemplateModel.mjs';
import KPISheet from '../../model/kpi/kpiSheetModel.mjs';
import UserModel from '../../model/userModel.mjs';

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    process.env.JWT_SECRET = 'test_secret';
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('KPI Module Tests', () => {
    let token;
    let userId;
    let templateId;
    let sheetId;

    beforeEach(async () => {
        // Clear DB
        await UserModel.deleteMany({});
        await KPITemplate.deleteMany({});
        await KPISheet.deleteMany({});

        // Create User
        const user = new UserModel({ username: 'testuser', first_name: 'Test', last_name: 'User', password: 'password' });
        await user.save();
        userId = user._id;

        // Generate Token
        token = jwt.sign({ _id: userId, first_name: 'Test' }, process.env.JWT_SECRET);
    });

    test('Should create a sheet and exclude Sundays from totals', async () => {
        // 1. Create Template
        const tmplRes = await request(app)
            .post('/api/kpi/template')
            .set('Cookie', [`token=${token}`])
            .send({
                name: 'Test Template',
                department: 'IT',
                rows: [{ id: 'row1', label: 'Calls', type: 'numeric' }]
            });
        expect(tmplRes.status).toBe(200);
        templateId = tmplRes.body._id;

        // 2. Generate Sheet (Current Month)
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        const sheetRes = await request(app)
            .post('/api/kpi/sheet/generate')
            .set('Cookie', [`token=${token}`])
            .send({ year, month, templateId });
        expect(sheetRes.status).toBe(200);
        sheetId = sheetRes.body._id;

        // 3. Enter Data for a non-Sunday
        // Find a non-Sunday
        let monday = 1;
        while (new Date(year, month - 1, monday).getDay() === 0) monday++;

        const entryRes = await request(app)
            .put('/api/kpi/sheet/entry')
            .set('Cookie', [`token=${token}`])
            .send({ sheetId, rowId: 'row1', day: monday, value: 10 });
        expect(entryRes.status).toBe(200);
        expect(entryRes.body.rows[0].total).toBe(10);

        // 4. Try to enter Data for Sunday
        let sunday = 1;
        while (new Date(year, month - 1, sunday).getDay() !== 0) sunday++;

        const sunRes = await request(app)
            .put('/api/kpi/sheet/entry')
            .set('Cookie', [`token=${token}`])
            .send({ sheetId, rowId: 'row1', day: sunday, value: 5 });
        expect(sunRes.status).toBe(400);
        expect(sunRes.body.message).toMatch(/Sunday/);

        // 5. Verify Total hasn't changed
        const verifyRes = await request(app)
            .get(`/api/kpi/sheet/${sheetId}`)
            .set('Cookie', [`token=${token}`]);
        expect(verifyRes.body.rows[0].total).toBe(10);
    });

    test('Should exclude Holidays from totals', async () => {
        // Setup Sheet
        const tmpl = await new KPITemplate({ owner: userId, name: 'T', department: 'D', rows: [{ id: 'row1', label: 'L' }] }).save();
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        const sheet = await new KPISheet({
            user: userId, year, month, template_version: tmpl._id,
            rows: [{ row_id: 'row1', daily_values: {}, total: 0 }],
            status: 'DRAFT', holidays: []
        }).save();

        // Find a Monday
        let monday = 1;
        while (new Date(year, month - 1, monday).getDay() === 0) monday++;

        // Enter value
        await request(app).put('/api/kpi/sheet/entry')
            .set('Cookie', [`token=${token}`])
            .send({ sheetId: sheet._id, rowId: 'row1', day: monday, value: 100 });

        // Mark as Holiday
        const holRes = await request(app).post('/api/kpi/sheet/holiday')
            .set('Cookie', [`token=${token}`])
            .send({ sheetId: sheet._id, day: monday });

        expect(holRes.status).toBe(200);
        // Total should be 0 now because the only entry is on a holiday
        expect(holRes.body.rows[0].total).toBe(0);

        // Try to edit holiday value
        const editRes = await request(app).put('/api/kpi/sheet/entry')
            .set('Cookie', [`token=${token}`])
            .send({ sheetId: sheet._id, rowId: 'row1', day: monday, value: 50 });
        expect(editRes.status).toBe(400);
    });

    test('Should prevent editing past weeks (Locked)', async () => {
        // Setup Sheet for previous month (definitely past week)
        // Or simply current month but day 1 (if today is late in month)

        // Better: Mock Date? Or use a date that is definitely "Past Week".
        // Logic: entryDate < StartOfCurrentWeek.
        // StartOfCurrentWeek is Sunday of this week.
        // So last week's days should fail.

        const today = new Date();
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);

        // Ensure we are testing same month/year handling or diff month
        const year = lastWeek.getFullYear();
        const month = lastWeek.getMonth() + 1;
        const day = lastWeek.getDate();

        const tmpl = await new KPITemplate({ owner: userId, name: 'T', department: 'D', rows: [{ id: 'row1', label: 'L' }] }).save();
        const sheet = await new KPISheet({
            user: userId, year, month, template_version: tmpl._id,
            rows: [{ row_id: 'row1', daily_values: {}, total: 0 }],
            status: 'DRAFT', holidays: []
        }).save();

        // Attempt Edit
        const res = await request(app).put('/api/kpi/sheet/entry')
            .set('Cookie', [`token=${token}`])
            .send({ sheetId: sheet._id, rowId: 'row1', day: day, value: 10 });

        // Note: If today is Sunday, lastWeek is also Sunday (locked by Sunday rule).
        // If today is Monday, lastWeek is Monday (past week).

        if (lastWeek.getDay() === 0) {
            expect(res.status).toBe(400); // Sunday Error
        } else {
            expect(res.status).toBe(400); // Past Week Error
            expect(res.body.message).toMatch(/Past weeks are locked/);
        }
    });
});
