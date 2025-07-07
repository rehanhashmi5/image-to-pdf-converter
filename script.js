document.addEventListener('DOMContentLoaded', function() {
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const selectFilesBtn = document.getElementById('selectFiles');
    const convertBtn = document.getElementById('convertBtn');
    const clearBtn = document.getElementById('clearBtn');
    const imagePreview = document.getElementById('imagePreview');
    const previewSection = document.getElementById('previewSection');
    const loading = document.getElementById('loading');
    
    let files = [];
    
    // Event listeners
    selectFilesBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    convertBtn.addEventListener('click', convertToPdf);
    clearBtn.addEventListener('click', clearAll);
    
    // Drag and drop events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropArea.classList.add('drag-over');
    }
    
    function unhighlight() {
        dropArea.classList.remove('drag-over');
    }
    
    dropArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const newFiles = dt.files;
        handleFiles(newFiles);
    }
    
    function handleFileSelect(e) {
        const newFiles = e.target.files;
        handleFiles(newFiles);
    }
    
    function handleFiles(newFiles) {
        files = Array.from(newFiles);
        
        // Filter only image files
        files = files.filter(file => file.type.match('image.*'));
        
        if (files.length === 0) {
            alert('Please select image files only (JPG, PNG, GIF, WEBP).');
            return;
        }
        
        // Check file sizes
        const maxSize = 5 * 1024 * 1024; // 5MB
        const oversizedFiles = files.filter(file => file.size > maxSize);
        
        if (oversizedFiles.length > 0) {
            alert(`Some files are larger than 5MB and will be skipped.`);
            files = files.filter(file => file.size <= maxSize);
        }
        
        if (files.length === 0) return;
        
        displayPreview();
    }
    
    function displayPreview() {
        imagePreview.innerHTML = '';
        
        files.forEach((file, index) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const imageItem = document.createElement('div');
                imageItem.className = 'image-item';
                
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = file.name;
                
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-btn';
                removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                removeBtn.addEventListener('click', () => removeImage(index));
                
                imageItem.appendChild(img);
                imageItem.appendChild(removeBtn);
                imagePreview.appendChild(imageItem);
            };
            
            reader.readAsDataURL(file);
        });
        
        previewSection.style.display = 'block';
    }
    
    function removeImage(index) {
        files.splice(index, 1);
        
        if (files.length === 0) {
            previewSection.style.display = 'none';
        } else {
            displayPreview();
        }
    }
    
    function clearAll() {
        files = [];
        fileInput.value = '';
        previewSection.style.display = 'none';
    }
    
    async function convertToPdf() {
        if (files.length === 0) {
            alert('Please select at least one image.');
            return;
        }
        
        loading.style.display = 'block';
        previewSection.style.display = 'none';
        
        try {
            // Get user options
            const pageSize = document.getElementById('pageSize').value;
            const orientation = document.getElementById('orientation').value;
            const margin = parseInt(document.getElementById('margin').value);
            
            // Create PDF
            const { PDFDocument, rgb } = PDFLib;
            const pdfDoc = await PDFDocument.create();
            
            // Process each image
            for (const file of files) {
                const imageBytes = await readFileAsArrayBuffer(file);
                let image;
                
                try {
                    if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
                        image = await pdfDoc.embedJpg(imageBytes);
                    } else if (file.type === 'image/png') {
                        image = await pdfDoc.embedPng(imageBytes);
                    } else {
                        // For other formats (GIF, WEBP), we'll try to convert to PNG first
                        const pngData = await convertImageToPng(file);
                        image = await pdfDoc.embedPng(pngData);
                    }
                    
                    // Create page with selected options
                    let page;
                    const dimensions = getPageDimensions(pageSize, orientation);
                    
                    if (orientation === 'portrait') {
                        page = pdfDoc.addPage([dimensions.width, dimensions.height]);
                    } else {
                        page = pdfDoc.addPage([dimensions.height, dimensions.width]);
                    }
                    
                    // Calculate image dimensions with margin
                    const marginPoints = mmToPoints(margin);
                    const maxWidth = page.getWidth() - (marginPoints * 2);
                    const maxHeight = page.getHeight() - (marginPoints * 2);
                    
                    let width = image.width;
                    let height = image.height;
                    
                    // Scale image to fit page with margins
                    const widthRatio = maxWidth / width;
                    const heightRatio = maxHeight / height;
                    const scale = Math.min(widthRatio, heightRatio);
                    
                    width = width * scale;
                    height = height * scale;
                    
                    // Center image on page
                    const x = (page.getWidth() - width) / 2;
                    const y = (page.getHeight() - height) / 2;
                    
                    page.drawImage(image, {
                        x,
                        y,
                        width,
                        height,
                    });
                    
                } catch (error) {
                    console.error(`Error processing ${file.name}:`, error);
                    continue;
                }
            }
            
            if (pdfDoc.getPageCount() === 0) {
                throw new Error('No valid images were processed.');
            }
            
            // Save PDF
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            saveAs(blob, 'converted_images.pdf');
            
        } catch (error) {
            console.error('Error creating PDF:', error);
            alert('An error occurred while creating the PDF. Please try again.');
        } finally {
            loading.style.display = 'none';
            previewSection.style.display = 'block';
        }
    }
    
    function readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }
    
    function convertImageToPng(file) {
        return new Promise((resolve) => {
            const img = new Image();
            const reader = new FileReader();
            
            reader.onload = function(e) {
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    canvas.toBlob((blob) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.readAsArrayBuffer(blob);
                    }, 'image/png');
                };
                img.src = e.target.result;
            };
            
            reader.readAsDataURL(file);
        });
    }
    
    function getPageDimensions(size, orientation) {
        // Dimensions in millimeters
        const sizes = {
            'A4': { width: 210, height: 297 },
            'Letter': { width: 216, height: 279 },
            'Legal': { width: 216, height: 356 }
        };
        
        return sizes[size] || sizes['A4'];
    }
    
    function mmToPoints(mm) {
        return mm * 2.83465; // 1mm = 2.83465 points
    }
});
