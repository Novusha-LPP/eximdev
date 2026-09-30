import express from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import CompanyBrochure from '../../model/crm/CompanyBrochure.mjs';
import CrmDesignRequest from '../../model/crm/CrmDesignRequest.mjs';
import logger from '../../logger.js';

const router = express.Router();

// ──────────────────────────────────────────────
// S3 & Multer Setup
// ──────────────────────────────────────────────
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

const s3Client = new S3Client({
  region: process.env.REACT_APP_AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.REACT_APP_ACCESS_KEY,
    secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY,
  },
});

// ──────────────────────────────────────────────
// Permissions Helper
// ──────────────────────────────────────────────
export const isKinjalOrAdmin = (req) => {
  const username = (
    req.user?.username || 
    req.headers['username'] || 
    req.body?.currentUsername || 
    ''
  ).toLowerCase().trim();

  const role = (
    req.user?.role || 
    req.headers['user-role'] || 
    ''
  ).toLowerCase().trim();

  // Kinjal Khatri check or Admin role check
  return (
    username === 'kinjal_khatri' ||
    username.includes('kinjal') ||
    role === 'admin'
  );
};

const requireKinjalOrAdmin = (req, res, next) => {
  if (!isKinjalOrAdmin(req)) {
    return res.status(403).json({
      error: 'Access Denied: Only Kinjal Khatri or an Administrator can perform this action.'
    });
  }
  next();
};

// ──────────────────────────────────────────────
// File Upload Endpoint
// ──────────────────────────────────────────────
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const timestamp = Date.now();
    const cleanOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `crm-brochures/${timestamp}-${cleanOriginalName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.REACT_APP_S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3Client.send(command);

    const region = process.env.REACT_APP_AWS_REGION || 'ap-south-1';
    const bucket = process.env.REACT_APP_S3_BUCKET;
    const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    return res.status(200).json({
      url,
      fileName: file.originalname,
      fileKey: key,
      fileSize: file.size,
      fileType: file.mimetype
    });
  } catch (err) {
    logger.error(`CRM Collaterals upload error: ${err.message}`, { stack: err.stack });
    return res.status(500).json({ error: 'Failed to upload file to storage' });
  }
});

// ──────────────────────────────────────────────
// Company Brochures & Video Links (CRUD)
// ──────────────────────────────────────────────

// GET / - Viewable by entire sales team
router.get('/', async (req, res) => {
  try {
    const { search, tag } = req.query;
    const query = { isActive: true };

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { companyName: regex },
        { description: regex },
        { 'brochures.title': regex },
        { 'videoLinks.title': regex },
        { tags: regex }
      ];
    }

    if (tag && tag.trim()) {
      query.tags = new RegExp(tag.trim(), 'i');
    }

    const items = await CompanyBrochure.find(query)
      .sort({ companyName: 1 })
      .lean();

    return res.json(items);
  } catch (err) {
    logger.error(`Failed to fetch company brochures: ${err.message}`);
    return res.status(500).json({ error: 'Failed to fetch company brochures' });
  }
});

// GET /:id - Single record
router.get('/:id', async (req, res) => {
  try {
    const item = await CompanyBrochure.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Company brochure not found' });
    }
    return res.json(item);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch company brochure' });
  }
});

// POST / - Only Kinjal or Admin
router.post('/', requireKinjalOrAdmin, async (req, res) => {
  try {
    const { companyName, accountId, industry, description, brochures, videoLinks, tags } = req.body;

    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    const currentUsername = req.headers['username'] || req.user?.username || 'kinjal_khatri';

    const normalizedCompanyName = companyName.trim();

    // Check if company already exists
    let existing = await CompanyBrochure.findOne({ 
      companyName: { $regex: new RegExp(`^${normalizedCompanyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      isActive: true 
    });

    if (existing) {
      // Append brochures and video links
      if (Array.isArray(brochures) && brochures.length > 0) {
        existing.brochures.push(...brochures.map(b => ({ ...b, uploadedBy: currentUsername })));
      }
      if (Array.isArray(videoLinks) && videoLinks.length > 0) {
        existing.videoLinks.push(...videoLinks.map(v => ({ ...v, addedBy: currentUsername })));
      }
      if (description) existing.description = description;
      if (industry) existing.industry = industry;
      if (accountId) existing.accountId = accountId;
      if (Array.isArray(tags)) {
        existing.tags = Array.from(new Set([...(existing.tags || []), ...tags]));
      }
      existing.updatedBy = currentUsername;

      await existing.save();
      return res.status(200).json(existing);
    }

    const newCompanyBrochure = new CompanyBrochure({
      companyName: normalizedCompanyName,
      accountId: accountId || null,
      industry: industry || '',
      description: description || '',
      brochures: (brochures || []).map(b => ({ ...b, uploadedBy: currentUsername })),
      videoLinks: (videoLinks || []).map(v => ({ ...v, addedBy: currentUsername })),
      tags: tags || [],
      createdBy: currentUsername,
      updatedBy: currentUsername
    });

    await newCompanyBrochure.save();
    return res.status(201).json(newCompanyBrochure);
  } catch (err) {
    logger.error(`Error adding company brochure: ${err.message}`);
    return res.status(500).json({ error: 'Failed to add company brochure' });
  }
});

// PUT /:id - Only Kinjal or Admin
router.put('/:id', requireKinjalOrAdmin, async (req, res) => {
  try {
    const currentUsername = req.headers['username'] || req.user?.username || 'kinjal_khatri';
    const { companyName, accountId, industry, description, brochures, videoLinks, tags } = req.body;

    const item = await CompanyBrochure.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Company brochure not found' });
    }

    if (companyName) item.companyName = companyName.trim();
    if (accountId !== undefined) item.accountId = accountId;
    if (industry !== undefined) item.industry = industry;
    if (description !== undefined) item.description = description;
    if (brochures !== undefined) item.brochures = brochures;
    if (videoLinks !== undefined) item.videoLinks = videoLinks;
    if (tags !== undefined) item.tags = tags;
    item.updatedBy = currentUsername;

    await item.save();
    return res.json(item);
  } catch (err) {
    logger.error(`Error updating company brochure: ${err.message}`);
    return res.status(500).json({ error: 'Failed to update company brochure' });
  }
});

// DELETE /:id - Only Kinjal or Admin
router.delete('/:id', requireKinjalOrAdmin, async (req, res) => {
  try {
    const item = await CompanyBrochure.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Company brochure not found' });
    }
    item.isActive = false;
    await item.save();
    return res.json({ message: 'Company brochure removed successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete company brochure' });
  }
});

// ──────────────────────────────────────────────
// Design Requirements Desk (Sales Team & Kinjal)
// ──────────────────────────────────────────────

// GET /design-requests - Viewable by sales team & Kinjal
router.get('/design-requests/list', async (req, res) => {
  try {
    const { status, company, search } = req.query;
    const query = {};

    if (status && status !== 'All') {
      query.status = status;
    }
    if (company) {
      query.companyName = new RegExp(company.trim(), 'i');
    }
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { companyName: regex },
        { title: regex },
        { description: regex },
        { 'requestedBy.fullName': regex },
        { 'requestedBy.username': regex }
      ];
    }

    const requests = await CrmDesignRequest.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return res.json(requests);
  } catch (err) {
    logger.error(`Failed to fetch design requests: ${err.message}`);
    return res.status(500).json({ error: 'Failed to fetch design requests' });
  }
});

// POST /design-requests - Raised by any Sales team member
router.post('/design-requests', async (req, res) => {
  try {
    const {
      companyName,
      accountId,
      title,
      requestType,
      description,
      priority,
      neededByDate,
      referenceAttachments
    } = req.body;

    if (!companyName || !title || !description) {
      return res.status(400).json({ error: 'Company Name, Title, and Description are required' });
    }

    const userId = req.headers['user-id'] || req.user?._id || null;
    const username = req.headers['username'] || req.user?.username || 'sales_user';
    const role = req.headers['user-role'] || req.user?.role || 'Sales Rep';

    const newRequest = new CrmDesignRequest({
      companyName: companyName.trim(),
      accountId: accountId || null,
      title: title.trim(),
      requestType: requestType || 'Brochure Design',
      description: description.trim(),
      priority: priority || 'Medium',
      status: 'Pending',
      neededByDate: neededByDate ? new Date(neededByDate) : null,
      referenceAttachments: referenceAttachments || [],
      requestedBy: {
        userId,
        username,
        fullName: req.body.requestedByName || username,
        role
      },
      assignedTo: {
        username: 'kinjal_khatri',
        fullName: 'Kinjal Khatri'
      }
    });

    await newRequest.save();
    return res.status(201).json(newRequest);
  } catch (err) {
    logger.error(`Failed to create design request: ${err.message}`);
    return res.status(500).json({ error: 'Failed to submit design requirement' });
  }
});

// PUT /design-requests/:id/status - Status change
router.put('/design-requests/:id/status', async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const request = await CrmDesignRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Design request not found' });
    }

    if (status) request.status = status;
    if (remarks) request.remarks = remarks;

    await request.save();
    return res.json(request);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update request status' });
  }
});

// PUT /design-requests/:id - Update existing design request / completed entry (Kinjal or Admin)
router.put('/design-requests/:id', requireKinjalOrAdmin, async (req, res) => {
  try {
    const {
      companyName,
      title,
      requestType,
      description,
      priority,
      status,
      files,
      videoLinks,
      remarks,
      publishToBrochures
    } = req.body;

    const request = await CrmDesignRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Design request not found' });
    }

    const currentUsername = req.headers['username'] || req.user?.username || 'kinjal_khatri';

    const oldFiles = request.completedDesign?.files || [];
    const oldVideoLinks = request.completedDesign?.videoLinks || [];
    const oldCompanyName = request.companyName;

    if (companyName) request.companyName = companyName.trim();
    if (title) request.title = title.trim();
    if (requestType) request.requestType = requestType;
    if (description !== undefined) request.description = description.trim();
    if (priority) request.priority = priority;
    if (status) request.status = status;
    if (remarks !== undefined) request.remarks = remarks.trim();
    if (publishToBrochures !== undefined) request.publishedToBrochures = !!publishToBrochures;

    // Update completedDesign
    if (!request.completedDesign) {
      request.completedDesign = {};
    }
    if (title) request.completedDesign.designTitle = title.trim();
    if (files !== undefined) {
      request.completedDesign.files = files;
      request.completedDesign.fileUrl = (files && files[0]?.url) || '';
    }
    if (videoLinks !== undefined) {
      request.completedDesign.videoLinks = videoLinks;
    }
    if (remarks !== undefined) {
      request.completedDesign.remarks = remarks.trim();
    }
    request.completedDesign.completedAt = request.completedDesign.completedAt || new Date();
    request.completedDesign.completedBy = currentUsername;

    await request.save();

    // If published to brochures, sync with CompanyBrochure
    if (request.publishedToBrochures) {
      const normalizedCompanyName = (companyName || oldCompanyName).trim();
      let companyBrochure = await CompanyBrochure.findOne({
        companyName: { $regex: new RegExp(`^${normalizedCompanyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        isActive: true
      });

      const oldFileUrls = new Set(oldFiles.map(f => f.url));
      const oldVidUrls = new Set(oldVideoLinks.map(v => v.url));

      const newBrochureEntries = (files || []).map(f => ({
        title: f.name || title || request.title,
        fileUrl: f.url,
        fileType: f.fileType || 'pdf',
        uploadedAt: new Date(),
        uploadedBy: currentUsername
      }));

      const newVideoEntries = (videoLinks || []).map(v => ({
        title: v.title || `${normalizedCompanyName} Video`,
        url: v.url,
        platform: v.platform || 'YouTube',
        addedAt: new Date(),
        addedBy: currentUsername
      }));

      if (companyBrochure) {
        // Remove old files that were part of this design request
        const filteredBrochures = (companyBrochure.brochures || []).filter(b => !oldFileUrls.has(b.fileUrl));
        const filteredVideos = (companyBrochure.videoLinks || []).filter(v => !oldVidUrls.has(v.url));

        // Add new entries (preventing duplicate URLs)
        const newUrls = new Set(newBrochureEntries.map(e => e.fileUrl));
        const finalBrochures = filteredBrochures.filter(b => !newUrls.has(b.fileUrl)).concat(newBrochureEntries);

        const newVUrls = new Set(newVideoEntries.map(e => e.url));
        const finalVideos = filteredVideos.filter(v => !newVUrls.has(v.url)).concat(newVideoEntries);

        companyBrochure.brochures = finalBrochures;
        companyBrochure.videoLinks = finalVideos;
        companyBrochure.updatedBy = currentUsername;
        await companyBrochure.save();
      } else if (newBrochureEntries.length > 0 || newVideoEntries.length > 0) {
        companyBrochure = new CompanyBrochure({
          companyName: normalizedCompanyName,
          accountId: request.accountId || null,
          description: `Assets for ${normalizedCompanyName}`,
          brochures: newBrochureEntries,
          videoLinks: newVideoEntries,
          createdBy: currentUsername,
          updatedBy: currentUsername
        });
        await companyBrochure.save();
      }
    }

    return res.json({
      message: 'Design entry updated successfully',
      request
    });
  } catch (err) {
    logger.error(`Error updating design request: ${err.message}`);
    return res.status(500).json({ error: 'Failed to update design entry' });
  }
});

// DELETE /design-requests/:id - Delete design request / entry (Kinjal or Admin, or requester)
router.delete('/design-requests/:id', async (req, res) => {
  try {
    const request = await CrmDesignRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Design request not found' });
    }

    const currentUsername = (req.headers['username'] || req.user?.username || '').toLowerCase().trim();
    const canDelete = isKinjalOrAdmin(req) || (currentUsername && currentUsername === (request.requestedBy?.username || '').toLowerCase());

    if (!canDelete) {
      return res.status(403).json({ error: 'Access Denied: You do not have permission to delete this design entry.' });
    }

    // If it was published to company brochures, clean up matching files
    if (request.publishedToBrochures && request.completedDesign?.files?.length > 0) {
      const fileUrlsToRemove = new Set((request.completedDesign.files || []).map(f => f.url));
      const videoUrlsToRemove = new Set((request.completedDesign.videoLinks || []).map(v => v.url));

      const normalizedCompanyName = request.companyName.trim();
      const companyBrochure = await CompanyBrochure.findOne({
        companyName: { $regex: new RegExp(`^${normalizedCompanyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        isActive: true
      });

      if (companyBrochure) {
        companyBrochure.brochures = (companyBrochure.brochures || []).filter(b => !fileUrlsToRemove.has(b.fileUrl));
        companyBrochure.videoLinks = (companyBrochure.videoLinks || []).filter(v => !videoUrlsToRemove.has(v.url));
        await companyBrochure.save();
      }
    }

    await CrmDesignRequest.findByIdAndDelete(req.params.id);

    return res.json({
      message: 'Design requirement entry deleted successfully',
      deletedId: req.params.id
    });
  } catch (err) {
    logger.error(`Error deleting design request: ${err.message}`);
    return res.status(500).json({ error: 'Failed to delete design entry' });
  }
});

// POST /design-requests/:id/complete - "Add New Design" (Kinjal Only)
router.post('/design-requests/:id/complete', requireKinjalOrAdmin, async (req, res) => {
  try {
    const {
      designTitle,
      fileUrl,
      files,
      videoLinks,
      remarks,
      publishToBrochures
    } = req.body;

    const request = await CrmDesignRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Design request not found' });
    }

    const currentUsername = req.headers['username'] || req.user?.username || 'kinjal_khatri';

    request.completedDesign = {
      designTitle: designTitle || request.title,
      fileUrl: fileUrl || (files && files[0]?.url) || '',
      files: files || [],
      videoLinks: videoLinks || [],
      remarks: remarks || '',
      completedAt: new Date(),
      completedBy: currentUsername
    };

    request.status = 'Completed';
    request.publishedToBrochures = !!publishToBrochures;
    await request.save();

    // If option selected to publish directly to company brochures
    if (publishToBrochures) {
      const normalizedCompanyName = request.companyName.trim();
      let companyBrochure = await CompanyBrochure.findOne({
        companyName: { $regex: new RegExp(`^${normalizedCompanyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        isActive: true
      });

      const newBrochureEntries = (files || []).map(f => ({
        title: f.name || designTitle || request.title,
        fileUrl: f.url,
        fileType: f.fileType || 'pdf',
        uploadedAt: new Date(),
        uploadedBy: currentUsername
      }));

      // If single fileUrl was also passed
      if (fileUrl && (!files || files.length === 0)) {
        newBrochureEntries.push({
          title: designTitle || request.title,
          fileUrl: fileUrl,
          fileType: 'pdf',
          uploadedAt: new Date(),
          uploadedBy: currentUsername
        });
      }

      const newVideoEntries = (videoLinks || []).map(v => ({
        title: v.title || `${request.companyName} Video`,
        url: v.url,
        platform: v.platform || 'YouTube',
        addedAt: new Date(),
        addedBy: currentUsername
      }));

      if (companyBrochure) {
        if (newBrochureEntries.length > 0) {
          companyBrochure.brochures.push(...newBrochureEntries);
        }
        if (newVideoEntries.length > 0) {
          companyBrochure.videoLinks.push(...newVideoEntries);
        }
        companyBrochure.updatedBy = currentUsername;
        await companyBrochure.save();
      } else {
        companyBrochure = new CompanyBrochure({
          companyName: normalizedCompanyName,
          accountId: request.accountId || null,
          description: `Assets for ${normalizedCompanyName}`,
          brochures: newBrochureEntries,
          videoLinks: newVideoEntries,
          createdBy: currentUsername,
          updatedBy: currentUsername
        });
        await companyBrochure.save();
      }
    }

    return res.json({
      message: 'Design completed successfully',
      request
    });
  } catch (err) {
    logger.error(`Error completing design request: ${err.message}`);
    return res.status(500).json({ error: 'Failed to complete design request' });
  }
});

// POST /design-requests/add-direct-design - Direct "Add New Design" button for Kinjal
router.post('/add-direct-design', requireKinjalOrAdmin, async (req, res) => {
  try {
    const {
      companyName,
      title,
      requestType,
      files,
      videoLinks,
      remarks,
      publishToBrochures
    } = req.body;

    if (!companyName || !title) {
      return res.status(400).json({ error: 'Company Name and Title are required' });
    }

    const currentUsername = req.headers['username'] || req.user?.username || 'kinjal_khatri';

    // 1. Create a completed design request record for history & tracking
    const newRequest = new CrmDesignRequest({
      companyName: companyName.trim(),
      title: title.trim(),
      requestType: requestType || 'Brochure Design',
      description: remarks || 'Direct design uploaded by Kinjal',
      priority: 'Medium',
      status: 'Completed',
      requestedBy: {
        username: currentUsername,
        fullName: 'Kinjal Khatri',
        role: 'Designer / Marketing'
      },
      assignedTo: {
        username: 'kinjal_khatri',
        fullName: 'Kinjal Khatri'
      },
      completedDesign: {
        designTitle: title.trim(),
        fileUrl: files && files[0]?.url ? files[0].url : '',
        files: files || [],
        videoLinks: videoLinks || [],
        remarks: remarks || '',
        completedAt: new Date(),
        completedBy: currentUsername
      },
      publishedToBrochures: publishToBrochures !== false
    });

    await newRequest.save();

    // 2. If publishToBrochures (default true), publish to CompanyBrochure
    if (publishToBrochures !== false) {
      const normalizedCompanyName = companyName.trim();
      let companyBrochure = await CompanyBrochure.findOne({
        companyName: { $regex: new RegExp(`^${normalizedCompanyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        isActive: true
      });

      const newBrochureEntries = (files || []).map(f => ({
        title: f.name || title.trim(),
        fileUrl: f.url,
        fileType: f.fileType || 'pdf',
        uploadedAt: new Date(),
        uploadedBy: currentUsername
      }));

      const newVideoEntries = (videoLinks || []).map(v => ({
        title: v.title || `${title.trim()} Video`,
        url: v.url,
        platform: v.platform || 'YouTube',
        addedAt: new Date(),
        addedBy: currentUsername
      }));

      if (companyBrochure) {
        if (newBrochureEntries.length > 0) {
          companyBrochure.brochures.push(...newBrochureEntries);
        }
        if (newVideoEntries.length > 0) {
          companyBrochure.videoLinks.push(...newVideoEntries);
        }
        companyBrochure.updatedBy = currentUsername;
        await companyBrochure.save();
      } else {
        companyBrochure = new CompanyBrochure({
          companyName: normalizedCompanyName,
          description: `Assets for ${normalizedCompanyName}`,
          brochures: newBrochureEntries,
          videoLinks: newVideoEntries,
          createdBy: currentUsername,
          updatedBy: currentUsername
        });
        await companyBrochure.save();
      }
    }

    return res.status(201).json({
      message: 'New design added successfully',
      request: newRequest
    });
  } catch (err) {
    logger.error(`Error adding direct design: ${err.message}`);
    return res.status(500).json({ error: 'Failed to add new design' });
  }
});

export default router;
