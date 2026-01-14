# File Handling

## Overview

File handling is a common requirement in backend applications - from profile picture uploads to document processing. Understanding how to handle files securely and efficiently is important for production applications and is frequently covered in interviews.

## File Uploads with Multer

### Basic Setup

```javascript
const express = require('express');
const multer = require('multer');
const app = express();

// Simple in-memory storage
const upload = multer();

// Single file upload
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  console.log(req.file);
  /*
  {
    fieldname: 'file',
    originalname: 'image.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: <Buffer ...>,
    size: 12345
  }
  */

  res.json({
    message: 'File uploaded successfully',
    filename: req.file.originalname,
    size: req.file.size
  });
});
```

### Disk Storage

```javascript
const path = require('path');

// Configure disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

app.post('/upload', upload.single('avatar'), (req, res) => {
  res.json({
    message: 'File uploaded successfully',
    filename: req.file.filename,
    path: req.file.path
  });
});
```

### Multiple Files Upload

```javascript
// Multiple files with same field name
app.post('/upload-multiple', upload.array('photos', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const files = req.files.map(file => ({
    filename: file.filename,
    path: file.path,
    size: file.size
  }));

  res.json({
    message: `${req.files.length} files uploaded successfully`,
    files
  });
});

// Multiple files with different field names
app.post('/upload-fields',
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'gallery', maxCount: 8 }
  ]),
  (req, res) => {
    console.log(req.files);
    /*
    {
      avatar: [{ fieldname, originalname, ... }],
      gallery: [{ ... }, { ... }]
    }
    */

    res.json({
      message: 'Files uploaded successfully',
      avatar: req.files.avatar?.[0],
      gallery: req.files.gallery
    });
  }
);
```

## File Validation

### File Type Validation

```javascript
const fileFilter = (req, file, cb) => {
  // Accept images only
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

app.post('/upload', upload.single('image'), (req, res) => {
  res.json({
    message: 'Image uploaded successfully',
    file: req.file
  });
});

// Error handling for file uploads
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large (max 5MB)' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files' });
    }
    return res.status(400).json({ error: err.message });
  }

  if (err) {
    return res.status(400).json({ error: err.message });
  }

  next();
});
```

### Advanced Validation

```javascript
const path = require('path');
const fileType = require('file-type');

const validateFile = async (file) => {
  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];

  if (!allowedExtensions.includes(ext)) {
    throw new Error('Invalid file extension');
  }

  // Check actual file type (prevents extension spoofing)
  const type = await fileType.fromBuffer(file.buffer);

  if (!type || !['image/jpeg', 'image/png', 'image/gif'].includes(type.mime)) {
    throw new Error('Invalid file type');
  }

  // Check file size
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File too large');
  }

  return true;
};

app.post('/upload',
  upload.single('image'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      await validateFile(req.file);

      res.json({
        message: 'File uploaded successfully',
        file: req.file
      });
    } catch (error) {
      next(error);
    }
  }
);
```

## Image Processing

### Using Sharp

```javascript
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

app.post('/upload-image',
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
      }

      const filename = req.file.filename;
      const filepath = req.file.path;

      // Create thumbnail
      const thumbnailPath = path.join('uploads/thumbnails', filename);
      await sharp(filepath)
        .resize(200, 200, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      // Optimize original image
      await sharp(filepath)
        .jpeg({ quality: 90 })
        .toFile(filepath + '.optimized');

      // Replace original with optimized
      await fs.rename(filepath + '.optimized', filepath);

      res.json({
        message: 'Image uploaded and processed successfully',
        original: filepath,
        thumbnail: thumbnailPath
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Generate multiple sizes
app.post('/upload-responsive',
  upload.single('image'),
  async (req, res) => {
    try {
      const sizes = [
        { name: 'thumbnail', width: 150, height: 150 },
        { name: 'small', width: 320, height: null },
        { name: 'medium', width: 640, height: null },
        { name: 'large', width: 1024, height: null }
      ];

      const results = {};

      for (const size of sizes) {
        const outputPath = path.join(
          'uploads',
          size.name,
          req.file.filename
        );

        await sharp(req.file.path)
          .resize(size.width, size.height, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 85 })
          .toFile(outputPath);

        results[size.name] = outputPath;
      }

      res.json({
        message: 'Image uploaded and processed',
        images: results
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);
```

## File Downloads

### Sending Files

```javascript
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, 'files', filename);

  // Check if file exists
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Send file
  res.download(filepath);
});

// Send file with custom name
app.get('/download/:id', async (req, res) => {
  const file = await File.findById(req.params.id);

  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.download(file.path, file.originalName);
});

// Stream large files
app.get('/stream/:filename', (req, res) => {
  const filepath = path.join(__dirname, 'files', req.params.filename);

  const stat = fs.statSync(filepath);
  res.writeHead(200, {
    'Content-Type': 'application/octet-stream',
    'Content-Length': stat.size
  });

  const stream = fs.createReadStream(filepath);
  stream.pipe(res);
});
```

### Video Streaming

```javascript
app.get('/video/:filename', (req, res) => {
  const filepath = path.join(__dirname, 'videos', req.params.filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Video not found' });
  }

  const stat = fs.statSync(filepath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    // Parse range header
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;

    const stream = fs.createReadStream(filepath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    });

    stream.pipe(res);
  } else {
    // No range, send entire file
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    });

    fs.createReadStream(filepath).pipe(res);
  }
});
```

## Cloud Storage Integration

### AWS S3

```javascript
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

// Configure multer to use S3
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    acl: 'public-read',
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `uploads/${uniqueSuffix}-${file.originalname}`);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

app.post('/upload', upload.single('file'), (req, res) => {
  res.json({
    message: 'File uploaded to S3',
    url: req.file.location,
    key: req.file.key
  });
});

// Delete from S3
app.delete('/files/:key', async (req, res) => {
  try {
    await s3.deleteObject({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: req.params.key
    }).promise();

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate signed URL for private files
app.get('/files/:key/url', (req, res) => {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: req.params.key,
    Expires: 3600 // URL valid for 1 hour
  };

  const url = s3.getSignedUrl('getObject', params);

  res.json({ url });
});
```

## File Management

### Database Integration

```javascript
// File model
const fileSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  mimetype: String,
  size: Number,
  path: String,
  url: String,
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

const File = mongoose.model('File', fileSchema);

// Upload and save to database
app.post('/upload',
  authenticate,
  upload.single('file'),
  async (req, res) => {
    try {
      const file = await File.create({
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        url: `/uploads/${req.file.filename}`,
        uploadedBy: req.user.userId
      });

      res.status(201).json({
        message: 'File uploaded successfully',
        file
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get user's files
app.get('/files', authenticate, async (req, res) => {
  const files = await File.find({ uploadedBy: req.user.userId })
    .sort({ uploadedAt: -1 });

  res.json({ files });
});

// Delete file
app.delete('/files/:id',
  authenticate,
  async (req, res) => {
    try {
      const file = await File.findById(req.params.id);

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Check ownership
      if (file.uploadedBy.toString() !== req.user.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Delete from disk
      await fs.unlink(file.path);

      // Delete from database
      await file.remove();

      res.json({ message: 'File deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);
```

## Security Best Practices

### File Upload Security

```javascript
const crypto = require('crypto');

// Generate secure filename
const generateFilename = (originalname) => {
  const hash = crypto.randomBytes(16).toString('hex');
  const ext = path.extname(originalname);
  return `${hash}${ext}`;
};

// Validate file content
const validateFileContent = async (filepath, expectedMimeType) => {
  const buffer = await fs.readFile(filepath);
  const type = await fileType.fromBuffer(buffer);

  if (!type || type.mime !== expectedMimeType) {
    await fs.unlink(filepath);
    throw new Error('File content does not match expected type');
  }
};

// Sanitize filename
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(0, 255);
};

// Complete secure upload
app.post('/upload-secure',
  authenticate,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Validate file content
      await validateFileContent(req.file.path, req.file.mimetype);

      // Generate secure filename
      const newFilename = generateFilename(req.file.originalname);
      const newPath = path.join('uploads', newFilename);

      // Rename file
      await fs.rename(req.file.path, newPath);

      // Save to database
      const file = await File.create({
        filename: newFilename,
        originalName: sanitizeFilename(req.file.originalname),
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: newPath,
        uploadedBy: req.user.userId
      });

      res.status(201).json({
        message: 'File uploaded securely',
        file
      });
    } catch (error) {
      // Clean up file on error
      if (req.file?.path) {
        await fs.unlink(req.file.path).catch(() => {});
      }

      res.status(500).json({ error: error.message });
    }
  }
);
```

## Interview Questions

### Q1: How do you handle file uploads in Express?

**Answer:**
Use Multer middleware:

```javascript
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('file'), (req, res) => {
  console.log(req.file);
  res.json({ filename: req.file.filename });
});
```

### Q2: How do you validate file types?

**Answer:**
Use fileFilter in Multer configuration:

```javascript
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'));
  }
};

const upload = multer({ fileFilter });
```

### Q3: How do you handle large file uploads?

**Answer:**
- Stream files instead of loading into memory
- Set appropriate limits in Multer
- Use progress tracking
- Consider chunked uploads for very large files

### Q4: How do you serve static files in Express?

**Answer:**
```javascript
app.use('/uploads', express.static('uploads'));

// Or with options
app.use('/uploads', express.static('uploads', {
  maxAge: '1d',
  index: false
}));
```

### Q5: How do you implement file downloads with authentication?

**Answer:**
```javascript
app.get('/download/:id', authenticate, async (req, res) => {
  const file = await File.findById(req.params.id);

  if (file.uploadedBy.toString() !== req.user.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.download(file.path, file.originalName);
});
```

## Best Practices

### ✅ Do's

1. **Validate file types and sizes**
2. **Generate unique filenames**
3. **Store files outside web root**
4. **Implement access control**
5. **Use virus scanning for production**
6. **Compress images**
7. **Use cloud storage for scalability**
8. **Clean up failed uploads**

### ❌ Don'ts

1. **Don't trust file extensions**
2. **Don't use original filenames directly**
3. **Don't store files in database (store paths)**
4. **Don't allow unlimited file sizes**
5. **Don't skip virus scanning**
6. **Don't expose file paths to users**

## Summary

**Core Concepts:**

1. **File Upload (Multer):**
   - ✅ Handle multipart/form-data
   - ✅ Configure storage (disk/memory)
   - ✅ Set file size limits
   - ✅ Filter file types

2. **Security:**
   - ⚠️ Never trust file extensions
   - ✅ Validate MIME types
   - ✅ Check magic numbers for true file type
   - ✅ Generate secure, random filenames
   - ✅ Store outside web root
   - ✅ Implement virus scanning (production)

3. **Image Processing:**
   - ✅ Use Sharp for resizing/optimization
   - ✅ Generate thumbnails
   - ✅ Convert formats (WebP for efficiency)
   - ✅ Strip metadata for privacy

4. **Best Practices:**
   - ✅ Stream large files (don't load in memory)
   - ✅ Use cloud storage (S3) for scalability
   - ✅ Implement access control
   - ✅ Clean up failed uploads
   - ✅ Set appropriate file size limits
   - ❌ Don't store in database (store paths only)

**Key Insights:**
> - Multer is the standard for file uploads in Express
> - Always validate file types by content, not extension
> - Stream large files to avoid memory issues
> - Cloud storage (S3) scales better than local filesystem

---

[← Previous: Security](./06-security.md) | [Next: Testing →](./08-testing.md)
