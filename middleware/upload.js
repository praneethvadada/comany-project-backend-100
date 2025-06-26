const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { sendBadRequest } = require('../utils/responseHelper');

// Ensure upload directories exist
const createUploadDirs = () => {
  const baseDir = process.env.UPLOAD_PATH || './uploads';
  const dirs = [
    path.join(baseDir, 'domains'),
    path.join(baseDir, 'subdomains'),
    path.join(baseDir, 'projects'),
    path.join(baseDir, 'temp')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Create upload directories on module load
createUploadDirs();

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const baseDir = process.env.UPLOAD_PATH || './uploads';
    let subDir = 'temp'; // Default to temp directory
    
    // Determine subdirectory based on entity type
    if (req.body.entityType) {
      switch (req.body.entityType) {
        case 'domain':
          subDir = 'domains';
          break;
        case 'subdomain':
          subDir = 'subdomains';
          break;
        case 'project':
          subDir = 'projects';
          break;
        default:
          subDir = 'temp';
      }
    }
    
    const uploadPath = path.join(baseDir, subDir);
    
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50);
    
    const filename = `${baseName}_${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

// File filter for images
const imageFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedMimes.join(', ')}`), false);
  }
};

// File filter for documents (block diagrams)
const documentFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedMimes.join(', ')}`), false);
  }
};

// Upload configurations
const uploadConfigs = {
  // Single image upload
  singleImage: multer({
    storage: storage,
    fileFilter: imageFilter,
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
      files: 1
    }
  }).single('image'),

  // Multiple images upload
  multipleImages: multer({
    storage: storage,
    fileFilter: imageFilter,
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
      files: 10 // Max 10 images per upload
    }
  }).array('images', 10),

  // Block diagram upload
  blockDiagram: multer({
    storage: storage,
    fileFilter: documentFilter,
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
      files: 1
    }
  }).single('blockDiagram'),

  // Mixed upload (images + documents)
  mixed: multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
      const allowedMimes = [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf'
      ];
      
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type. Allowed types: ${allowedMimes.join(', ')}`), false);
      }
    },
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
      files: 11 // 10 images + 1 document
    }
  }).fields([
    { name: 'images', maxCount: 10 },
    { name: 'blockDiagram', maxCount: 1 }
  ])
};

// Error handling middleware
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return sendBadRequest(res, `File too large. Maximum size is ${(parseInt(process.env.MAX_FILE_SIZE) || 5242880) / 1024 / 1024}MB`);
      case 'LIMIT_FILE_COUNT':
        return sendBadRequest(res, 'Too many files. Maximum allowed files exceeded');
      case 'LIMIT_UNEXPECTED_FILE':
        return sendBadRequest(res, 'Unexpected file field');
      default:
        return sendBadRequest(res, `Upload error: ${error.message}`);
    }
  } else if (error) {
    return sendBadRequest(res, error.message);
  }
  next();
};

// Cleanup temporary files utility
const cleanupTempFiles = (files) => {
  if (!files) return;
  
  const fileArray = Array.isArray(files) ? files : [files];
  
  fileArray.forEach(file => {
    if (file && file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (error) {
        console.error('Failed to cleanup temp file:', file.path, error);
      }
    }
  });
};

// Move file to final destination
const moveFile = (sourcePath, destPath) => {
  return new Promise((resolve, reject) => {
    // Ensure destination directory exists
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Copy file to destination
    const readStream = fs.createReadStream(sourcePath);
    const writeStream = fs.createWriteStream(destPath);

    readStream.on('error', reject);
    writeStream.on('error', reject);
    writeStream.on('finish', () => {
      // Delete source file
      fs.unlink(sourcePath, (err) => {
        if (err) console.error('Failed to delete source file:', err);
        resolve(destPath);
      });
    });

    readStream.pipe(writeStream);
  });
};

// Generate file URL
const generateFileUrl = (req, filePath) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const relativePath = path.relative(process.env.UPLOAD_PATH || './uploads', filePath);
  return `${baseUrl}/uploads/${relativePath.replace(/\\/g, '/')}`;
};

// Validate image dimensions (optional)
const validateImageDimensions = (filePath, maxWidth = 2048, maxHeight = 2048) => {
  return new Promise((resolve, reject) => {
    // This would require a library like 'sharp' or 'jimp'
    // For now, we'll just resolve true
    // You can implement actual dimension checking if needed
    resolve(true);
  });
};

// Compress image (optional)
const compressImage = async (inputPath, outputPath, quality = 80) => {
  // This would require a library like 'sharp'
  // For now, we'll just copy the file
  return new Promise((resolve, reject) => {
    fs.copyFile(inputPath, outputPath, (err) => {
      if (err) reject(err);
      else resolve(outputPath);
    });
  });
};

// Middleware to process uploaded files
const processUploadedFiles = async (req, res, next) => {
  try {
    if (req.file) {
      req.file.url = generateFileUrl(req, req.file.path);
    }
    
    if (req.files) {
      if (Array.isArray(req.files)) {
        req.files.forEach(file => {
          file.url = generateFileUrl(req, file.path);
        });
      } else {
        // Fields upload
        Object.keys(req.files).forEach(field => {
          req.files[field].forEach(file => {
            file.url = generateFileUrl(req, file.path);
          });
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Error processing uploaded files:', error);
    next(error);
  }
};

module.exports = {
  uploadConfigs,
  handleUploadError,
  cleanupTempFiles,
  moveFile,
  generateFileUrl,
  validateImageDimensions,
  compressImage,
  processUploadedFiles
};