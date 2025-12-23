mkdir image-upscale-website
cd image-upscale-website

# Create backend folder
mkdir backend
cd backend

# Initialize npm
npm init -y

# Install dependencies
npm install express multer cors sharp fs-extra

# Create necessary folders
mkdir uploads enhanced