require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch((err) => console.error('MongoDB Connection Error:', err));

// Load existing Response model from server/models/Response.js
let ResponseModel;
try {
  const loaded = require('./models/Response');
  ResponseModel = loaded.Response || loaded.default || loaded;
} catch (err) {
  console.warn('Could not require ./models/Response, using fallback schema:', err.message);
}

const fallbackResponseSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    age: { type: String, default: '' },
    kidsCount: { type: String, default: '' },
    kidsAges: { type: [String], default: [] },
    workingStatus: { type: String, default: '' },
    industry: { type: String, default: '' },
    continuedJob: { type: String, default: '' },
    timeOff: { type: String, default: '' },
    biggestChallenge: { type: String, default: '' },
    passionOrHome: { type: String, default: '' },
    joinedCommunity: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Response =
  ResponseModel && typeof ResponseModel.find === 'function'
    ? ResponseModel
    : mongoose.models.Response || mongoose.model('Response', fallbackResponseSchema);

// Middleware: Protect Admin Routes
const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: Token missing' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'pink_pelican_super_secret_key_2026'
    );
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin access only' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Session expired. Please login again.' });
  }
};

// 1. Public Route: Save Survey Form Submission
app.post('/api/submit', async (req, res) => {
  try {
    const newEntry = new Response(req.body);
    await newEntry.save();
    return res.status(201).json({ message: 'Response saved successfully', data: newEntry });
  } catch (err) {
    console.error('Submit Error:', err);
    return res.status(500).json({ message: 'Failed to save response' });
  }
});

// 2. Admin Login Route (ID/Email + Password)
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;

  const validEmail = (process.env.ADMIN_EMAIL || 'admin@thepinkpelican.com').toLowerCase().trim();
  const validPassword = process.env.ADMIN_PASSWORD || 'YourStrongPassword123';

  if (
    !email ||
    !password ||
    email.toLowerCase().trim() !== validEmail ||
    password !== validPassword
  ) {
    return res.status(401).json({ message: 'Invalid Admin ID/Email or Password' });
  }

  const token = jwt.sign(
    { email: validEmail, role: 'admin' },
    process.env.JWT_SECRET || 'pink_pelican_super_secret_key_2026',
    { expiresIn: '12h' }
  );

  return res.json({
    message: 'Admin login successful',
    token,
    admin: { email: validEmail },
  });
});

// 3. Admin Protected Route: Get All Submissions with 10-per-page Pagination
app.get('/api/admin/submissions', verifyAdmin, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
    const skip = (page - 1) * limit;

    const [submissions, totalCount] = await Promise.all([
      Response.find().sort({ _id: -1 }).skip(skip).limit(limit),
      Response.countDocuments(),
    ]);

    const totalPages = Math.max(Math.ceil(totalCount / limit), 1);

    return res.json({
      data: submissions,
      pagination: {
        currentPage: page,
        limit,
        totalCount,
        totalPages,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages,
      },
    });
  } catch (err) {
    console.error('Fetch Submissions Error:', err);
    return res.status(500).json({ message: 'Error fetching submissions' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});