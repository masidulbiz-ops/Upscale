const express = require('express');
const multer = require('multer');
const cors = require('cors');
const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/';
    fs.ensureDirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|bmp|tiff/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Routes
app.post('/api/upload-folder', upload.array('images', 100), async (req, res) => {
  try {
    const files = req.files;
    const results = [];

    for (const file of files) {
      const originalPath = file.path;
      const enhancedFilename = 'enhanced-' + file.filename;
      const enhancedPath = path.join('enhanced', enhancedFilename);

      // Ensure enhanced directory exists
      await fs.ensureDir('enhanced');

      // Simple upscaling using sharp (2x upscale)
      await sharp(originalPath)
        .resize({
          width: Math.round(file.width * 2) || 2000,
          height: Math.round(file.height * 2) || 2000,
          fit: 'contain',
          withoutEnlargement: false
        })
        .toFormat('jpeg', { quality: 90 })
        .toFile(enhancedPath);

      results.push({
        originalName: file.originalname,
        originalSize: file.size,
        enhancedName: enhancedFilename,
        enhancedPath: `/enhanced/${enhancedFilename}`,
        downloadUrl: `/api/download/${enhancedFilename}`
      });
    }

    res.json({ 
      success: true, 
      message: `${files.length} images processed successfully`,
      results 
    });
  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/upload-single', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    const enhancedFilename = 'enhanced-' + file.filename;
    const enhancedPath = path.join('enhanced', enhancedFilename);

    await fs.ensureDir('enhanced');

    await sharp(file.path)
      .resize({
        width: Math.round(file.width * 2) || 2000,
        height: Math.round(file.height * 2) || 2000,
        fit: 'contain',
        withoutEnlargement: false
      })
      .toFormat('jpeg', { quality: 90 })
      .toFile(enhancedPath);

    res.json({
      success: true,
      originalName: file.originalname,
      enhancedPath: `/enhanced/${enhancedFilename}`,
      downloadUrl: `/api/download/${enhancedFilename}`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/download/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'enhanced', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

app.use('/uploads', express.static('uploads'));
app.use('/enhanced', express.static('enhanced'));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});