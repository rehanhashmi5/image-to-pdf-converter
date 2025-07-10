/* ======================
   BUTTON FUNCTIONALITY FIXES 
   ====================== */
.file-input-wrapper {
    position: relative;
    display: inline-block;
}

input[type="file"] {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
}

/* Ensure buttons are clickable */
.btn {
    position: relative;
    pointer-events: none; /* Let click pass through to input */
}

.file-input-wrapper:hover .btn {
    background: var(--secondary-color);
}

/* Fix z-index issues */
.upload-area {
    position: relative;
    z-index: 1;
}

/* Remove any ad interference */
.ad-container {
    z-index: 0 !important;
    position: relative;
}
