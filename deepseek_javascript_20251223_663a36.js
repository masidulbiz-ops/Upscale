document.addEventListener('DOMContentLoaded', function() {
    const folderBtn = document.getElementById('folderBtn');
    const fileBtn = document.getElementById('fileBtn');
    const folderInput = document.getElementById('folderInput');
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    const processBtn = document.getElementById('processBtn');
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    const progressSection = document.getElementById('progressSection');
    const resultsSection = document.getElementById('resultsSection');
    const fileList = document.getElementById('fileList');
    const fileListContainer = document.getElementById('fileListContainer');
    const gallery = document.getElementById('gallery');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const resultsSummary = document.getElementById('resultsSummary');

    let selectedFiles = [];
    let processingResults = [];

    // Event Listeners
    folderBtn.addEventListener('click', () => folderInput.click());
    fileBtn.addEventListener('click', () => fileInput.click());

    folderInput.addEventListener('change', handleFolderSelection);
    fileInput.addEventListener('change', handleFileSelection);

    // Drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropZone.classList.add('drag-over');
    }

    function unhighlight() {
        dropZone.classList.remove('drag-over');
    }

    dropZone.addEventListener('drop', handleDrop, false);

    processBtn.addEventListener('click', processImages);
    downloadAllBtn.addEventListener('click', downloadAllImages);

    // Functions
    function handleFolderSelection(e) {
        const files = Array.from(e.target.files);
        handleFiles(files);
    }

    function handleFileSelection(e) {
        const files = Array.from(e.target.files);
        handleFiles(files);
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = Array.from(dt.files);
        
        // Check if it's a folder (Chrome specific)
        const items = Array.from(dt.items);
        const hasDirectory = items.some(item => item.webkitGetAsEntry && item.webkitGetAsEntry().isDirectory);
        
        if (hasDirectory) {
            // For folders in drop, we need special handling
            alert('Please use the "Select Folder" button for folder uploads in browsers that support it.');
            return;
        }
        
        handleFiles(files);
    }

    function handleFiles(files) {
        // Filter only image files
        const imageFiles = files.filter(file => 
            file.type.startsWith('image/') && 
            file.size <= 50 * 1024 * 1024 // 50MB limit
        );

        if (imageFiles.length === 0) {
            alert('Please select valid image files (JPG, PNG, WebP, etc.) under 50MB each.');
            return;
        }

        selectedFiles = imageFiles;
        updateFileList();
        processBtn.disabled = false;
        fileList.style.display = 'block';
    }

    function updateFileList() {
        fileListContainer.innerHTML = '';
        
        selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            
            fileItem.innerHTML = `
                <div class="file-name">
                    <i class="fas fa-image"></i>
                    ${file.name}
                </div>
                <div class="file-size">
                    ${formatFileSize(file.size)}
                </div>
            `;
            
            fileListContainer.appendChild(fileItem);
        });
    }

    async function processImages() {
        if (selectedFiles.length === 0) return;

        // Reset UI
        progressSection.style.display = 'block';
        resultsSection.style.display = 'none';
        progressFill.style.width = '0%';
        progressText.textContent = `0/${selectedFiles.length} images processed`;

        const formData = new FormData();
        selectedFiles.forEach(file => {
            formData.append('images', file);
        });

        const scaleFactor = document.getElementById('scaleFactor').value;
        const format = document.getElementById('format').value;

        try {
            const response = await fetch('http://localhost:5000/api/upload-folder', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                processingResults = result.results;
                updateProgress(selectedFiles.length, selectedFiles.length);
                showResults(result.results);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
            progressSection.style.display = 'none';
        }
    }

    function updateProgress(current, total) {
        const percentage = (current / total) * 100;
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `${current}/${total} images processed`;
    }

    function showResults(results) {
        progressSection.style.display = 'none';
        resultsSection.style.display = 'block';
        
        const totalSize = results.reduce((sum, result) => sum + result.originalSize, 0);
        const totalEnhanced = results.length;
        
        resultsSummary.innerHTML = `
            Processed <strong>${totalEnhanced} images</strong><br>
            Total original size: ${formatFileSize(totalSize)}
        `;
        
        gallery.innerHTML = '';
        results.forEach((result, index) => {
            const imageCard = document.createElement('div');
            imageCard.className = 'image-card';
            
            imageCard.innerHTML = `
                <img src="http://localhost:5000${result.enhancedPath}" alt="Enhanced">
                <div class="image-info">
                    <p><strong>${result.originalName}</strong></p>
                    <p>Size: ${formatFileSize(result.originalSize)} → Enhanced</p>
                    <button class="btn" onclick="downloadImage('${result.downloadUrl}', '${result.originalName}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            `;
            
            gallery.appendChild(imageCard);
        });
    }

    function downloadAllImages() {
        processingResults.forEach(result => {
            setTimeout(() => {
                downloadImage(result.downloadUrl, result.originalName);
            }, 100);
        });
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
});

// Global function for downloading individual images
function downloadImage(url, filename) {
    const a = document.createElement('a');
    a.href = 'http://localhost:5000' + url;
    a.download = filename.replace(/\.[^/.]+$/, "") + '-enhanced.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}