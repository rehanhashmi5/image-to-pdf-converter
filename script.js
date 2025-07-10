document.addEventListener('DOMContentLoaded', function() {
    // Image Converter
    const selectFilesBtn = document.getElementById('selectFiles');
    const fileInput = document.getElementById('fileInput');
    
    // This is the foolproof way to handle file selection
    selectFilesBtn.addEventListener('click', function(e) {
        // Create a temporary input if the existing one doesn't work
        if (!fileInput.click) {
            const tempInput = document.createElement('input');
            tempInput.type = 'file';
            tempInput.accept = 'image/*';
            tempInput.multiple = true;
            tempInput.click();
            tempInput.addEventListener('change', function() {
                handleFiles(this.files);
            });
            return;
        }
        fileInput.click();
    });

    fileInput.addEventListener('change', function(e) {
        console.log("Files selected:", e.target.files);
        // Add your file handling logic here
    });

    // Word Converter
    document.getElementById('selectWordFiles').addEventListener('click', function() {
        document.getElementById('wordFileInput').click();
    });

    // Merge PDF
    document.getElementById('selectMergeFiles').addEventListener('click', function() {
        document.getElementById('mergeFileInput').click();
    });

    // Debug: Test all buttons
    document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', function() {
            console.log("Button works:", this.id);
        });
    });
});

function handleFiles(files) {
    console.log("Processing files:", files);
    // Your file processing logic here
}
