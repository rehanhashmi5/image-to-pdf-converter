document.addEventListener('DOMContentLoaded', function() {
    // ======================
    // SHARED UTILITY FUNCTIONS
    // ======================
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight() {
        this.classList.add('drag-over');
    }

    function unhighlight() {
        this.classList.remove('drag-over');
    }

    function mmToPoints(mm) {
        return mm * 2.83465; // 1mm = 2.83465 points
    }

    function readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    // ======================
    // IMAGE TO PDF CONVERTER
    // ======================
    const imageConverter = {
        init() {
            this.dropArea = document.getElementById('dropArea');
            this.fileInput = document.getElementById('fileInput');
            this.selectFilesBtn = document.getElementById('selectFiles');
            this.convertBtn = document.getElementById('convertBtn');
            this.clearBtn = document.getElementById('clearBtn');
            this.imagePreview = document.getElementById('imagePreview');
            this.previewSection = document.getElementById('previewSection');
            this.loading = document.getElementById('loading');
            this.files = [];

            this.setupEventListeners();
        },

        setupEventListeners() {
            this.selectFilesBtn.addEventListener('click', () => this.fileInput.click());
            this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
            this.convertBtn.addEventListener('click', () => this.convertToPdf());
            this.clearBtn.addEventListener('click', () => this.clearAll());

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                this.dropArea.addEventListener(eventName, preventDefaults, false);
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                this.dropArea.addEventListener(eventName, highlight, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                this.dropArea.addEventListener(eventName, unhighlight, false);
            });

            this.dropArea.addEventListener('drop', (e) => this.handleDrop(e));
        },

        handleDrop(e) {
            const dt = e.dataTransfer;
            this.handleFiles(dt.files);
        },

        handleFileSelect(e) {
            this.handleFiles(e.target.files);
        },

        handleFiles(newFiles) {
            this.files = Array.from(newFiles).filter(file => file.type.match('image.*'));
            
            if (this.files.length === 0) {
                alert('Please select image files only (JPG, PNG, GIF, WEBP).');
                return;
            }

            const maxSize = 5 * 1024 * 1024; // 5MB
            this.files = this.files.filter(file => file.size <= maxSize);
            
            if (this.files.length === 0) {
                alert('All files were larger than 5MB');
                return;
            }

            this.displayPreview();
        },

        displayPreview() {
            this.imagePreview.innerHTML = '';
            
            this.files.forEach((file, index) => {
                const reader = new FileReader();
                
                reader.onload = (e) => {
                    const imageItem = document.createElement('div');
                    imageItem.className = 'image-item';
                    
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.alt = file.name;
                    
                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'remove-btn';
                    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                    removeBtn.addEventListener('click', () => this.removeImage(index));
                    
                    imageItem.appendChild(img);
                    imageItem.appendChild(removeBtn);
                    this.imagePreview.appendChild(imageItem);
                };
                
                reader.readAsDataURL(file);
            });
            
            this.previewSection.style.display = 'block';
        },

        removeImage(index) {
            this.files.splice(index, 1);
            this.displayPreview();
            if (this.files.length === 0) {
                this.previewSection.style.display = 'none';
            }
        },

        clearAll() {
            this.files = [];
            this.fileInput.value = '';
            this.previewSection.style.display = 'none';
        },

        async convertToPdf() {
            if (this.files.length === 0) {
                alert('Please select at least one image.');
                return;
            }
            
            this.loading.style.display = 'block';
            this.previewSection.style.display = 'none';
            
            try {
                const { PDFDocument, rgb } = PDFLib;
                const pdfDoc = await PDFDocument.create();
                const pageSize = document.getElementById('pageSize').value;
                const orientation = document.getElementById('orientation').value;
                const margin = parseInt(document.getElementById('margin').value);

                for (const file of this.files) {
                    try {
                        const imageBytes = await readFileAsArrayBuffer(file);
                        let image;
                        
                        if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
                            image = await pdfDoc.embedJpg(imageBytes);
                        } else if (file.type === 'image/png') {
                            image = await pdfDoc.embedPng(imageBytes);
                        } else {
                            // Convert other formats to PNG
                            const pngData = await this.convertImageToPng(file);
                            image = await pdfDoc.embedPng(pngData);
                        }
                        
                        const dimensions = this.getPageDimensions(pageSize, orientation);
                        const page = orientation === 'portrait' 
                            ? pdfDoc.addPage([dimensions.width, dimensions.height])
                            : pdfDoc.addPage([dimensions.height, dimensions.width]);
                        
                        const marginPoints = mmToPoints(margin);
                        const maxWidth = page.getWidth() - (marginPoints * 2);
                        const maxHeight = page.getHeight() - (marginPoints * 2);
                        
                        const scale = Math.min(
                            maxWidth / image.width,
                            maxHeight / image.height
                        );
                        
                        const width = image.width * scale;
                        const height = image.height * scale;
                        const x = (page.getWidth() - width) / 2;
                        const y = (page.getHeight() - height) / 2;
                        
                        page.drawImage(image, { x, y, width, height });
                    } catch (error) {
                        console.error(`Error processing ${file.name}:`, error);
                        continue;
                    }
                }
                
                const pdfBytes = await pdfDoc.save();
                saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), 'converted_images.pdf');
            } catch (error) {
                console.error('PDF creation error:', error);
                alert('Error creating PDF. Please try again.');
            } finally {
                this.loading.style.display = 'none';
                this.previewSection.style.display = 'block';
            }
        },

        convertImageToPng(file) {
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
        },

        getPageDimensions(size, orientation) {
            const sizes = {
                'A4': { width: 210, height: 297 },
                'Letter': { width: 216, height: 279 },
                'Legal': { width: 216, height: 356 }
            };
            return sizes[size] || sizes['A4'];
        }
    };

    // ======================
    // WORD TO PDF CONVERTER
    // ======================
    const wordConverter = {
        init() {
            this.wordDropArea = document.getElementById('wordDropArea');
            this.wordFileInput = document.getElementById('wordFileInput');
            this.selectWordFiles = document.getElementById('selectWordFiles');
            this.wordPreviewSection = document.getElementById('wordPreviewSection');
            this.wordFilePreview = document.getElementById('wordFilePreview');
            this.convertWordBtn = document.getElementById('convertWordBtn');
            this.clearWordBtn = document.getElementById('clearWordBtn');
            this.wordFiles = [];

            this.setupEventListeners();
        },

        setupEventListeners() {
            this.selectWordFiles.addEventListener('click', () => this.wordFileInput.click());
            this.wordFileInput.addEventListener('change', (e) => this.handleWordFileSelect(e));
            this.convertWordBtn.addEventListener('click', () => this.convertToPdf());
            this.clearWordBtn.addEventListener('click', () => this.clearAll());

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
                this.wordDropArea.addEventListener(event, preventDefaults, false);
            });

            this.wordDropArea.addEventListener('drop', (e) => this.handleWordDrop(e));
        },

        handleWordDrop(e) {
            const dt = e.dataTransfer;
            this.handleWordFiles(dt.files);
        },

        handleWordFileSelect(e) {
            this.handleWordFiles(e.target.files);
        },

        handleWordFiles(files) {
            this.wordFiles = Array.from(files).filter(file => 
                file.name.match(/\.(doc|docx)$/i)
            );
            
            if (this.wordFiles.length === 0) {
                alert('Please select Word files only (.doc or .docx)');
                return;
            }
            
            this.showWordPreview();
        },

        showWordPreview() {
            this.wordFilePreview.innerHTML = '';
            
            this.wordFiles.forEach((file, index) => {
                const previewItem = document.createElement('div');
                previewItem.className = 'file-preview-item';
                previewItem.innerHTML = `
                    <i class="fas fa-file-word"></i>
                    <span>${file.name}</span>
                    <button class="remove-word-btn" data-index="${index}">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                this.wordFilePreview.appendChild(previewItem);
            });
            
            // Add remove button events
            document.querySelectorAll('.remove-word-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = e.currentTarget.dataset.index;
                    this.wordFiles.splice(index, 1);
                    this.showWordPreview();
                    if (this.wordFiles.length === 0) {
                        this.wordPreviewSection.style.display = 'none';
                    }
                });
            });
            
            this.wordPreviewSection.style.display = 'block';
        },

        clearAll() {
            this.wordFiles = [];
            this.wordFileInput.value = '';
            this.wordPreviewSection.style.display = 'none';
        },

        async convertToPdf() {
            if (this.wordFiles.length === 0) return;
            
            const loading = document.getElementById('loading');
            loading.style.display = 'block';
            
            try {
                // Note: This requires a real API endpoint
                alert("Word conversion would use a real API in production");
                
                // For testing, create a dummy PDF
                const { PDFDocument } = PDFLib;
                const pdfDoc = await PDFDocument.create();
                const page = pdfDoc.addPage([600, 800]);
                page.drawText("Word content would appear here", {
                    x: 50, y: 750, size: 12
                });
                
                const pdfBytes = await pdfDoc.save();
                saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), 'converted_word.pdf');
            } catch (error) {
                alert('Error: ' + error.message);
            } finally {
                loading.style.display = 'none';
            }
        }
    };

    // ======================
    // MERGE PDF FUNCTIONALITY
    // ======================
    const pdfMerger = {
        init() {
            this.mergeDropArea = document.getElementById('mergeDropArea');
            this.mergeFileInput = document.getElementById('mergeFileInput');
            this.selectMergeFiles = document.getElementById('selectMergeFiles');
            this.mergePreviewSection = document.getElementById('mergePreviewSection');
            this.mergeFilePreview = document.getElementById('mergeFilePreview');
            this.mergeBtn = document.getElementById('mergeBtn');
            this.clearMergeBtn = document.getElementById('clearMergeBtn');
            this.addPageNumbers = document.getElementById('addPageNumbers');
            this.pdfFilesToMerge = [];

            this.setupEventListeners();
        },

        setupEventListeners() {
            this.selectMergeFiles.addEventListener('click', () => this.mergeFileInput.click());
            this.mergeFileInput.addEventListener('change', (e) => this.handleMergeFileSelect(e));
            this.mergeBtn.addEventListener('click', () => this.mergePdfs());
            this.clearMergeBtn.addEventListener('click', () => this.clearAll());

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
                this.mergeDropArea.addEventListener(event, preventDefaults, false);
            });

            this.mergeDropArea.addEventListener('drop', (e) => this.handleMergeDrop(e));
        },

        handleMergeDrop(e) {
            const dt = e.dataTransfer;
            this.handleMergeFiles(dt.files);
        },

        handleMergeFileSelect(e) {
            this.handleMergeFiles(e.target.files);
        },

        handleMergeFiles(files) {
            const newFiles = Array.from(files).filter(file => 
                file.type === 'application/pdf'
            );
            
            if (newFiles.length === 0) {
                alert('Please select PDF files only');
                return;
            }
            
            this.pdfFilesToMerge = [...this.pdfFilesToMerge, ...newFiles];
            this.showMergePreview();
        },

        showMergePreview() {
            this.mergeFilePreview.innerHTML = '';
            
            this.pdfFilesToMerge.forEach((file, index) => {
                const previewItem = document.createElement('div');
                previewItem.className = 'sortable-item';
                previewItem.draggable = true;
                previewItem.dataset.index = index;
                previewItem.innerHTML = `
                    <i class="fas fa-file-pdf"></i>
                    <span>${file.name}</span>
                    <button class="remove-merge-btn" data-index="${index}">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                this.mergeFilePreview.appendChild(previewItem);
            });
            
            this.setupDragAndDrop();
            this.mergePreviewSection.style.display = 'block';
        },

        setupDragAndDrop() {
            const items = this.mergeFilePreview.querySelectorAll('.sortable-item');
            
            items.forEach(item => {
                item.addEventListener('dragstart', () => {
                    item.classList.add('dragging');
                });
                
                item.addEventListener('dragend', () => {
                    item.classList.remove('dragging');
                });
            });
            
            this.mergeFilePreview.addEventListener('dragover', e => {
                e.preventDefault();
                const draggingItem = document.querySelector('.dragging');
                const siblings = [...this.mergeFilePreview.querySelectorAll('.sortable-item:not(.dragging)')];
                
                const nextSibling = siblings.find(sibling => {
                    return e.clientY <= sibling.offsetTop + sibling.offsetHeight / 2;
                });
                
                this.mergeFilePreview.insertBefore(draggingItem, nextSibling);
            });
            
            this.mergeFilePreview.addEventListener('drop', () => {
                const newOrder = [...this.mergeFilePreview.querySelectorAll('.sortable-item')];
                this.pdfFilesToMerge = newOrder.map(item => this.pdfFilesToMerge[item.dataset.index]);
                this.showMergePreview();
            });
        },

        async mergePdfs() {
            if (this.pdfFilesToMerge.length < 2) {
                alert('Please select at least 2 PDF files to merge');
                return;
            }
            
            const loading = document.getElementById('loading');
            loading.style.display = 'block';
            
            try {
                const { PDFDocument } = PDFLib;
                const mergedPdf = await PDFDocument.create();
                
                for (const file of this.pdfFilesToMerge) {
                    const fileBytes = await file.arrayBuffer();
                    const pdfDoc = await PDFDocument.load(fileBytes);
                    
                    if (this.addPageNumbers.checked) {
                        const pages = pdfDoc.getPages();
                        pages.forEach((page, i) => {
                            page.drawText(`Page ${i + 1}`, {
                                x: page.getWidth() - 50,
                                y: 20,
                                size: 10,
                            });
                        });
                    }
                    
                    const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                    pages.forEach(page => mergedPdf.addPage(page));
                }
                
                const mergedPdfBytes = await mergedPdf.save();
                saveAs(new Blob([mergedPdfBytes], { type: 'application/pdf' }), 'merged-document.pdf');
            } catch (error) {
                alert('Error merging PDFs: ' + error.message);
            } finally {
                loading.style.display = 'none';
            }
        },

        clearAll() {
            this.pdfFilesToMerge = [];
            this.mergeFileInput.value = '';
            this.mergePreviewSection.style.display = 'none';
        }
    };

    // Initialize all converters
    imageConverter.init();
    wordConverter.init();
    pdfMerger.init();
});
```
