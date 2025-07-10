document.addEventListener('DOMContentLoaded', function() {
    // Basic functionality test
    document.getElementById('selectFiles').addEventListener('click', function() {
        console.log("Select Files button working!");
        document.getElementById('fileInput').click();
    });
    
    document.getElementById('fileInput').addEventListener('change', function(e) {
        alert(e.target.files.length + " files selected!");
    });
});
