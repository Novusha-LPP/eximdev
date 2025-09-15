import express from 'express';
import ExportJobModel from '../../model/export/ExJobModel.mjs';

const router = express.Router();

// GET /api/exports - List all exports with pagination & filtering
router.get('/api/exports', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', exporter = '', country = '', movement_type = '' } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { job_no: { $regex: search, $options: 'i' } },
        { exporter_name: { $regex: search, $options: 'i' } },
        { consignee_name: { $regex: search, $options: 'i' } }
      ];
    }
    if (exporter) filter.exporter_name = { $regex: exporter, $options: 'i' };
    if (country) filter.country_of_final_destination = { $regex: country, $options: 'i' };
    if (movement_type) filter.movement_type = movement_type;

    const skip = (page - 1) * limit;
    const [jobs, totalCount] = await Promise.all([
      ExportJobModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      ExportJobModel.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / limit),
          totalCount
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching jobs', error: error.message });
  }
});

// POST /api/exports - Create new export job
router.post('/exports', async (req, res) => {
  try {
    const newJob = new ExportJobModel(req.body);
    const savedJob = await newJob.save();
    res.status(201).json({ success: true, data: savedJob });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating job', error: error.message });
  }
});

router.post('/api/test/seed-data', async (req, res) => {
  try {
    const sampleJobs = [
      {
      "exporter_name": "SAMPLE EXPORTER LTD",
    "consignee_name": "SAMPLE CONSIGNEE LTD",
    "ie_code": "1234567890",
    "job_no": "AMD/EXP/SEA/00015/25-26",
    "movement_type": "FCL",
    "country_of_final_destination": "USA",
    "commodity_description": "Industrial Equipment",
    "commercial_invoice_value": "25000.00",
    "invoice_currency": "USD",
    "port_of_loading": "JNPT",
    "port_of_discharge": "NEW YORK",
    "total_packages": "10",
    "gross_weight_kg": "5000",
    "net_weight_kg": "4500",
    "status": "pending"
      },
      // Add more sample jobs...
    ];

    const insertedJobs = await ExportJobModel.insertMany(sampleJobs);
    
    res.status(201).json({
      success: true,
      message: `Successfully inserted ${insertedJobs.length} sample export jobs`,
      data: { count: insertedJobs.length, jobs: insertedJobs }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error inserting sample data',
      error: error.message
    });
  }
});

export default router;
