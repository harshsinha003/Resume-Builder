/**
 * Resume Builder - JavaScript
 * 
 * This file contains all the interactive functionality for the resume builder:
 * - Form validation with real-time feedback
 * - Error handling and user messaging
 * - Photo upload and preview
 * - Multiple template system
 * - PDF generation with different templates
 * - Accessibility features (keyboard navigation, screen reader support)
 * - Local storage for saving progress
 * - Responsive behavior
 */

/* ==========================================
   Global Variables and Configuration
   ========================================== */

// Application state
const ResumeBuilder = {
    currentTemplate: 'modern',
    formData: {},
    isGenerating: false,
    
    // Configuration constants
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB in bytes
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    LOCAL_STORAGE_KEY: 'resumeBuilderData',
    
    // DOM elements cache
    elements: {}
};

// Validation rules
const ValidationRules = {
    name: {
        required: true,
        minLength: 2,
        pattern: /^[a-zA-Z\s'-]+$/,
        message: 'Name must contain only letters, spaces, hyphens, and apostrophes'
    },
    email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: 'Please enter a valid email address'
    },
    phone: {
        required: true,
        pattern: /^[\+]?[\d\s\(\)\-]{10,}$/,
        message: 'Please enter a valid phone number (minimum 10 digits)'
    },
    address: {
        required: true,
        minLength: 10,
        message: 'Address must be at least 10 characters'
    },
    about: {
        required: false, // Optional professional summary
        minLength: 20,
        message: 'Professional summary should be at least 20 characters'
    },
    experience: {
        required: false, // Optional - will be included if filled
        minLength: 20,
        message: 'Experience should be at least 20 characters when provided'
    },
    education: {
        required: false, // Optional - will be included if filled
        minLength: 20,
        message: 'Education should be at least 20 characters when provided'
    },
    skills: {
        required: false, // Optional - will be included if filled
        minLength: 5,
        customValidator: (value) => {
            if (!value.trim()) return true; // Allow empty
            const skills = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
            return skills.length >= 2 ? true : 'Please enter at least 2 skills separated by commas';
        },
        message: 'Please enter at least 2 skills separated by commas when provided'
    },
    strengths: {
        required: false, // Optional - will be included if filled
        minLength: 10,
        message: 'Strengths should be at least 10 characters when provided'
    },
    achievements: {
        required: false, // Optional - will be included if filled
        minLength: 10,
        message: 'Achievements should be at least 10 characters when provided'
    },
    projects: {
        required: false, // Optional section
        minLength: 10,
        message: 'Projects should be at least 10 characters when provided'
    },
    certificates: {
        required: false, // Optional section
        minLength: 10,
        message: 'Certificates should be at least 10 characters when provided'
    },
    'custom-title': {
        required: false, // Optional section
        minLength: 2,
        message: 'Custom section title must be at least 2 characters'
    },
    'custom-content': {
        required: false, // Optional section
        minLength: 5,
        message: 'Custom section content should be at least 5 characters when provided'
    }
};

/* ==========================================
   Initialization and Event Listeners
   ========================================== */

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    try {
        initializeApplication();
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showMessage('Failed to initialize application. Please refresh the page.', 'error');
    }
});

/**
 * Main initialization function
 */
function initializeApplication() {
    cacheElements();
    setupEventListeners();
    setupAccessibilityFeatures();
    loadSavedData();
    initializePhotoPreview();
    
    console.log('Resume Builder initialized successfully');
}

/**
 * Cache frequently used DOM elements for better performance
 */
function cacheElements() {
    ResumeBuilder.elements = {
        form: document.getElementById('resumeForm'),
        messageContainer: document.getElementById('message-container'),
        loadingIndicator: document.getElementById('loading-indicator'),
        photoInput: document.getElementById('photo'),
        photoPreview: document.getElementById('photo-preview'),
        saveButton: document.getElementById('save-progress'),
        templateRadios: document.querySelectorAll('input[name="template"]'),
        
        // Checkbox controls
        includePhoto: document.getElementById('include-photo'),
        
        // Form groups
        photoGroup: document.getElementById('photo-group'),
        experienceGroup: document.getElementById('experience-group'),
        projectsGroup: document.getElementById('projects-group'),
        certificatesGroup: document.getElementById('certificates-group'),
        customTitleGroup: document.getElementById('custom-title-group'),
        customContentGroup: document.getElementById('custom-content-group'),
        
        // Form fields
        fields: {
            name: document.getElementById('name'),
            email: document.getElementById('email'),
            phone: document.getElementById('phone'),
            address: document.getElementById('address'),
            about: document.getElementById('about'),
            experience: document.getElementById('experience'),
            education: document.getElementById('education'),
            skills: document.getElementById('skills'),
            strengths: document.getElementById('strengths'),
            achievements: document.getElementById('achievements'),
            projects: document.getElementById('projects'),
            certificates: document.getElementById('certificates'),
            'custom-title': document.getElementById('custom-title'),
            'custom-content': document.getElementById('custom-content')
        }
    };
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Form submission
    ResumeBuilder.elements.form.addEventListener('submit', handleFormSubmission);
    
    // Photo upload and preview
    ResumeBuilder.elements.photoInput.addEventListener('change', handlePhotoUpload);
    
    // Real-time validation for all form fields
    Object.keys(ResumeBuilder.elements.fields).forEach(fieldName => {
        const field = ResumeBuilder.elements.fields[fieldName];
        if (field) {
            field.addEventListener('blur', () => validateField(fieldName));
            field.addEventListener('input', () => clearFieldError(fieldName));
        }
    });
    
    // Template selection
    ResumeBuilder.elements.templateRadios.forEach(radio => {
        radio.addEventListener('change', handleTemplateChange);
    });
    
    // Save progress button
    ResumeBuilder.elements.saveButton.addEventListener('click', saveProgress);
    
    // Checkbox controls for optional sections
    ResumeBuilder.elements.includePhoto.addEventListener('change', togglePhotoSection);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Auto-save on form changes (debounced)
    let autoSaveTimer;
    ResumeBuilder.elements.form.addEventListener('input', () => {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(autoSave, 2000); // Auto-save after 2 seconds of inactivity
    });
    
    // Prevent data loss on page unload
    window.addEventListener('beforeunload', handleBeforeUnload);
}

/**
 * Set up accessibility features
 */
function setupAccessibilityFeatures() {
    // Add aria-live region for dynamic updates
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'visually-hidden';
    liveRegion.id = 'live-region';
    document.body.appendChild(liveRegion);
    
    // Announce template changes to screen readers
    ResumeBuilder.elements.templateRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            announceToScreenReader(`Template changed to ${radio.value}`);
        });
    });
}

/* ==========================================
   Form Validation Functions
   ========================================== */

/**
 * Validate a specific form field
 * @param {string} fieldName - Name of the field to validate
 * @returns {boolean} - True if field is valid
 */
function validateField(fieldName) {
    const field = ResumeBuilder.elements.fields[fieldName];
    if (!field) return true; // Field doesn't exist
    
    const rules = ValidationRules[fieldName];
    if (!rules) return true; // No validation rules
    
    const value = field.value.trim();
    
    // Clear previous error state
    clearFieldError(fieldName);
    
    try {
        // Check if field is conditionally required
        const isRequired = isFieldRequired(fieldName);
        
        // Required field check
        if (isRequired && !value) {
            showFieldError(fieldName, `${getFieldLabel(fieldName)} is required`);
            return false;
        }
        
        // Skip other validations if field is empty and not required
        if (!value && !isRequired) {
            return true;
        }
        
        // Length validations
        if (rules.minLength && value.length < rules.minLength) {
            showFieldError(fieldName, `${getFieldLabel(fieldName)} must be at least ${rules.minLength} characters`);
            return false;
        }
        
        // Pattern validation
        if (rules.pattern && !rules.pattern.test(value)) {
            showFieldError(fieldName, rules.message);
            return false;
        }
        
        // Custom validation
        if (rules.customValidator) {
            const customResult = rules.customValidator(value);
            if (customResult !== true) {
                showFieldError(fieldName, customResult);
                return false;
            }
        }
        
        // Field is valid
        showFieldSuccess(fieldName);
        return true;
        
    } catch (error) {
        console.error(`Validation error for field ${fieldName}:`, error);
        showFieldError(fieldName, 'Validation error occurred');
        return false;
    }
}

/**
 * Check if a field is required based on its checkbox state
 * @param {string} fieldName - Name of the field
 * @returns {boolean} - True if field is required
 */
function isFieldRequired(fieldName) {
    const rules = ValidationRules[fieldName];
    if (!rules) return false;
    
    // Always required fields
    if (rules.required === true) return true;
    
    // Conditionally required fields based on checkboxes
    switch (fieldName) {
        case 'experience':
            return ResumeBuilder.elements.includeExperience.checked;
        case 'projects':
            return ResumeBuilder.elements.includeProjects.checked;
        case 'certificates':
            return ResumeBuilder.elements.includeCertificates.checked;
        case 'custom-title':
        case 'custom-content':
            return ResumeBuilder.elements.includeCustom.checked;
        default:
            return false;
    }
}

/**
 * Validate all form fields
 * @returns {boolean} - True if all fields are valid
 */
function validateAllFields() {
    let isValid = true;
    const fieldNames = Object.keys(ResumeBuilder.elements.fields);
    
    fieldNames.forEach(fieldName => {
        if (!validateField(fieldName)) {
            isValid = false;
        }
    });
    
    return isValid;
}

/**
 * Show field error state and message
 * @param {string} fieldName - Name of the field
 * @param {string} message - Error message to display
 */
function showFieldError(fieldName, message) {
    const field = ResumeBuilder.elements.fields[fieldName];
    const formGroup = field.closest('.form-group');
    const errorElement = formGroup.querySelector('.error-message');
    
    // Add error classes
    formGroup.classList.add('error');
    formGroup.classList.remove('success');
    
    // Show error message
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }
    
    // Set aria-invalid
    field.setAttribute('aria-invalid', 'true');
    
    // Announce error to screen readers
    announceToScreenReader(`Error in ${getFieldLabel(fieldName)}: ${message}`);
}

/**
 * Show field success state
 * @param {string} fieldName - Name of the field
 */
function showFieldSuccess(fieldName) {
    const field = ResumeBuilder.elements.fields[fieldName];
    const formGroup = field.closest('.form-group');
    
    // Add success classes
    formGroup.classList.add('success');
    formGroup.classList.remove('error');
    
    // Set aria-invalid
    field.setAttribute('aria-invalid', 'false');
}

/**
 * Clear field error state
 * @param {string} fieldName - Name of the field
 */
function clearFieldError(fieldName) {
    const field = ResumeBuilder.elements.fields[fieldName];
    const formGroup = field.closest('.form-group');
    const errorElement = formGroup.querySelector('.error-message');
    
    // Remove error classes
    formGroup.classList.remove('error');
    
    // Hide error message
    if (errorElement) {
        errorElement.classList.remove('show');
    }
    
    // Remove aria-invalid if not required or has value
    const rules = ValidationRules[fieldName];
    if (!rules.required || field.value.trim()) {
        field.removeAttribute('aria-invalid');
    }
}

/**
 * Get user-friendly field label
 * @param {string} fieldName - Name of the field
 * @returns {string} - Human-readable field label
 */
function getFieldLabel(fieldName) {
    const labels = {
        name: 'Full Name',
        email: 'Email',
        phone: 'Phone',
        address: 'Address',
        experience: 'Professional Experience',
        education: 'Education',
        skills: 'Skills',
        strengths: 'Strengths',
        achievements: 'Achievements',
        projects: 'Projects',
        certificates: 'Certificates',
        'custom-title': 'Custom Section Title',
        'custom-content': 'Custom Section Content'
    };
    
    return labels[fieldName] || fieldName;
}

/* ==========================================
   Section Toggle Functions
   ========================================== */

/**
 * Toggle photo section visibility
 */
function togglePhotoSection() {
    const isChecked = ResumeBuilder.elements.includePhoto.checked;
    ResumeBuilder.elements.photoGroup.style.display = isChecked ? 'block' : 'none';
    
    if (!isChecked) {
        // Reset photo to default when disabled
        ResumeBuilder.elements.photoPreview.src = createDefaultPhotoDataURL();
        ResumeBuilder.elements.photoInput.value = '';
    }
    
    announceToScreenReader(`Photo section ${isChecked ? 'enabled' : 'disabled'}`);
}

/* ==========================================
   Photo Upload and Preview Functions
   ========================================== */

/**
 * Initialize photo preview with default image
 */
function initializePhotoPreview() {
    // Set default photo if none exists
    if (!ResumeBuilder.elements.photoPreview.src || ResumeBuilder.elements.photoPreview.src === window.location.href) {
        ResumeBuilder.elements.photoPreview.src = createDefaultPhotoDataURL();
    }
}

/**
 * Handle photo file upload
 * @param {Event} event - File input change event
 */
function handlePhotoUpload(event) {
    const file = event.target.files[0];
    
    try {
        // Clear previous errors
        clearPhotoError();
        
        if (!file) {
            // Reset to default photo if no file selected
            ResumeBuilder.elements.photoPreview.src = createDefaultPhotoDataURL();
            return;
        }
        
        // Validate file
        const validationResult = validatePhotoFile(file);
        if (!validationResult.isValid) {
            showPhotoError(validationResult.message);
            event.target.value = ''; // Clear the input
            return;
        }
        
        // Read and preview the file
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                ResumeBuilder.elements.photoPreview.src = e.target.result;
                announceToScreenReader('Photo uploaded successfully');
            } catch (error) {
                console.error('Error setting photo preview:', error);
                showPhotoError('Failed to load photo preview');
            }
        };
        
        reader.onerror = function() {
            console.error('FileReader error');
            showPhotoError('Failed to read photo file');
        };
        
        reader.readAsDataURL(file);
        
    } catch (error) {
        console.error('Photo upload error:', error);
        showPhotoError('An error occurred while uploading the photo');
    }
}

/**
 * Validate uploaded photo file
 * @param {File} file - The uploaded file
 * @returns {Object} - Validation result with isValid and message
 */
function validatePhotoFile(file) {
    // Check file size
    if (file.size > ResumeBuilder.MAX_FILE_SIZE) {
        return {
            isValid: false,
            message: `File size must be less than ${ResumeBuilder.MAX_FILE_SIZE / (1024 * 1024)}MB`
        };
    }
    
    // Check file type
    if (!ResumeBuilder.ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return {
            isValid: false,
            message: 'Please upload a valid image file (JPG, PNG, or WebP)'
        };
    }
    
    return { isValid: true };
}

/**
 * Show photo upload error
 * @param {string} message - Error message
 */
function showPhotoError(message) {
    const photoGroup = ResumeBuilder.elements.photoInput.closest('.form-group');
    const errorElement = photoGroup.querySelector('.error-message');
    
    photoGroup.classList.add('error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }
    
    announceToScreenReader(`Photo upload error: ${message}`);
}

/**
 * Clear photo upload error
 */
function clearPhotoError() {
    const photoGroup = ResumeBuilder.elements.photoInput.closest('.form-group');
    const errorElement = photoGroup.querySelector('.error-message');
    
    photoGroup.classList.remove('error');
    if (errorElement) {
        errorElement.classList.remove('show');
    }
}

/**
 * Create a default photo data URL
 * @returns {string} - Data URL for default photo
 */
function createDefaultPhotoDataURL() {
    // Create a simple colored circle as default photo
    const canvas = document.createElement('canvas');
    canvas.width = 150;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    
    // Draw background circle
    ctx.fillStyle = '#3498db';
    ctx.beginPath();
    ctx.arc(75, 75, 75, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw person icon
    ctx.fillStyle = 'white';
    ctx.font = '60px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('👤', 75, 95);
    
    return canvas.toDataURL();
}

/* ==========================================
   Template Selection Functions
   ========================================== */

/**
 * Handle template selection change
 * @param {Event} event - Radio button change event
 */
function handleTemplateChange(event) {
    try {
        ResumeBuilder.currentTemplate = event.target.value;
        
        // Update UI to reflect selected template
        updateTemplatePreview();
        
        // Save template choice
        saveTemplateChoice();
        
        announceToScreenReader(`Selected ${event.target.value} template`);
        
    } catch (error) {
        console.error('Template change error:', error);
        showMessage('Failed to change template', 'error');
    }
}

/**
 * Update template preview (placeholder for future enhancement)
 */
function updateTemplatePreview() {
    // Future enhancement: Show live preview of selected template
    console.log(`Template changed to: ${ResumeBuilder.currentTemplate}`);
}

/**
 * Save template choice to localStorage
 */
function saveTemplateChoice() {
    try {
        localStorage.setItem('selectedTemplate', ResumeBuilder.currentTemplate);
    } catch (error) {
        console.warn('Failed to save template choice:', error);
    }
}

/**
 * Load saved template choice
 */
function loadSavedTemplate() {
    try {
        const savedTemplate = localStorage.getItem('selectedTemplate');
        if (savedTemplate) {
            ResumeBuilder.currentTemplate = savedTemplate;
            
            // Update radio button
            const templateRadio = document.querySelector(`input[name="template"][value="${savedTemplate}"]`);
            if (templateRadio) {
                templateRadio.checked = true;
            }
        }
    } catch (error) {
        console.warn('Failed to load saved template:', error);
    }
}

/* ==========================================
   Form Submission and PDF Generation
   ========================================== */

/**
 * Handle form submission
 * @param {Event} event - Form submit event
 */
async function handleFormSubmission(event) {
    event.preventDefault();
    
    try {
        // Prevent multiple submissions
        if (ResumeBuilder.isGenerating) {
            showMessage('PDF generation already in progress', 'warning');
            return;
        }
        
        // Validate all fields
        if (!validateAllFields()) {
            showMessage('Please fix the errors above before generating your resume', 'error');
            scrollToFirstError();
            return;
        }
        
        // Collect form data
        const formData = collectFormData();
        if (!formData) {
            showMessage('Failed to collect form data', 'error');
            return;
        }
        
        // Generate PDF
        await generatePDF(formData);
        
    } catch (error) {
        console.error('Form submission error:', error);
        showMessage('An error occurred while generating your resume. Please try again.', 'error');
        hideLoading();
    }
}

/**
 * Collect all form data
 * @returns {Object|null} - Form data object or null if error
 */
function collectFormData() {
    try {
        const data = {
            name: ResumeBuilder.elements.fields.name.value.trim(),
            email: ResumeBuilder.elements.fields.email.value.trim(),
            phone: ResumeBuilder.elements.fields.phone.value.trim(),
            address: ResumeBuilder.elements.fields.address.value.trim(),
            about: ResumeBuilder.elements.fields.about.value.trim(),
            experience: ResumeBuilder.elements.fields.experience.value.trim(),
            education: ResumeBuilder.elements.fields.education.value.trim(),
            skills: ResumeBuilder.elements.fields.skills.value.trim(),
            strengths: ResumeBuilder.elements.fields.strengths.value.trim(),
            achievements: ResumeBuilder.elements.fields.achievements.value.trim(),
            projects: ResumeBuilder.elements.fields.projects.value.trim(),
            certificates: ResumeBuilder.elements.fields.certificates.value.trim(),
            customTitle: ResumeBuilder.elements.fields['custom-title'].value.trim(),
            customContent: ResumeBuilder.elements.fields['custom-content'].value.trim(),
            template: ResumeBuilder.currentTemplate,
            
            // Only photo still has checkbox control
            includePhoto: ResumeBuilder.elements.includePhoto.checked
        };
        
        // Add photo only if included
        if (data.includePhoto) {
            data.photo = ResumeBuilder.elements.photoPreview.src;
        }
        
        return data;
    } catch (error) {
        console.error('Error collecting form data:', error);
        return null;
    }
}

/**
 * Generate PDF from form data
 * @param {Object} formData - The collected form data
 */
async function generatePDF(formData) {
    try {
        ResumeBuilder.isGenerating = true;
        showLoading('Generating your resume...');
        
        // Populate the selected template
        populateTemplate(formData);
        
        // Get the template element
        const templateElement = document.getElementById(`pdf-${formData.template}`);
        if (!templateElement) {
            throw new Error(`Template ${formData.template} not found`);
        }
        
        // Show template for rendering
        templateElement.style.display = 'block';
        templateElement.style.position = 'absolute';
        templateElement.style.left = '-9999px';
        templateElement.style.top = '0';
        
        // Wait for fonts and images to load
        await waitForResources();
        
        // Check content height and adjust if necessary
        await adjustTemplateForContent(templateElement);
        
        // Generate PDF using html2canvas and jsPDF with better scaling
        const canvas = await html2canvas(templateElement, {
            scale: 1.5, // Reduced scale for better performance while maintaining quality
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            height: templateElement.scrollHeight, // Use actual content height
            width: templateElement.offsetWidth,
            scrollX: 0,
            scrollY: 0,
            logging: false // Disable logging for cleaner output
        });
        
        // Hide template
        templateElement.style.display = 'none';
        
        // Create PDF with proper scaling
        const pdf = new jspdf.jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        // Calculate proper dimensions
        const pageWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Check if content fits on one page
        if (imgHeight <= pageHeight) {
            // Single page - fits perfectly
            const imgData = canvas.toDataURL('image/png', 0.8); // Reduced quality for smaller file size
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        } else {
            // Multi-page handling
            await handleMultiPagePDF(pdf, canvas, pageWidth, pageHeight);
        }
        
        // Save PDF
        const fileName = `${formData.name.replace(/[^a-zA-Z0-9]/g, '_')}_Resume.pdf`;
        pdf.save(fileName);
        
        // Success message
        showMessage(`Resume generated successfully! Downloaded as ${fileName}`, 'success');
        announceToScreenReader('Resume PDF generated and downloaded successfully');
        
        // Save successful generation data
        saveSuccessfulGeneration(formData);
        
    } catch (error) {
        console.error('PDF generation error:', error);
        showMessage('Failed to generate PDF. Please try again.', 'error');
        throw error;
    } finally {
        ResumeBuilder.isGenerating = false;
        hideLoading();
    }
}

/**
 * Adjust template content for better fitting
 * @param {HTMLElement} templateElement - The template element
 */
async function adjustTemplateForContent(templateElement) {
    // Check the actual height of the content
    const contentHeight = templateElement.scrollHeight;
    const pageHeight = 297 * 3.77953; // A4 height in pixels (approximate)
    const overflowRatio = contentHeight / pageHeight;
    
    console.log(`Content height: ${contentHeight}px, Page height: ${pageHeight}px, Ratio: ${overflowRatio.toFixed(2)}`);
    
    if (overflowRatio > 1.1) {
        // Add compact class for automatic styling
        templateElement.classList.add('compact');
        
        // For severe overflow, apply additional scaling
        if (overflowRatio > 1.6) {
            const scaleFactor = Math.max(0.75, 1 / overflowRatio);
            templateElement.style.transform = `scale(${scaleFactor})`;
            templateElement.style.transformOrigin = 'top left';
            templateElement.style.width = `${100 / scaleFactor}%`;
            templateElement.style.height = `${100 / scaleFactor}%`;
            
            console.log(`Applied scale transform: ${scaleFactor.toFixed(2)}`);
        }
        
        // Additional manual adjustments for extreme cases
        if (overflowRatio > 2.0) {
            // Further reduce spacing
            const sections = templateElement.querySelectorAll('.content-block, .classic-content-block, .creative-content-block');
            sections.forEach(section => {
                section.style.margin = '2px 0';
                section.style.fontSize = '9px';
            });
            
            // Make photos even smaller
            const photo = templateElement.querySelector('.pdf-photo, .pdf-photo-classic, .pdf-photo-creative');
            if (photo) {
                photo.style.width = '50px';
                photo.style.height = '50px';
            }
        }
    }
    
    // Give the browser time to reflow the content
    await new Promise(resolve => setTimeout(resolve, 150));
}

/**
 * Handle multi-page PDF generation
 * @param {jsPDF} pdf - The PDF object
 * @param {HTMLCanvasElement} canvas - The canvas with the content
 * @param {number} pageWidth - PDF page width
 * @param {number} pageHeight - PDF page height
 */
async function handleMultiPagePDF(pdf, canvas, pageWidth, pageHeight) {
    const imgData = canvas.toDataURL('image/png', 0.8);
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Calculate how many pages we need
    const totalPages = Math.ceil(imgHeight / pageHeight);
    
    for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
            pdf.addPage();
        }
        
        // Calculate the portion of the image for this page
        const sourceY = page * (canvas.height / totalPages);
        const sourceHeight = canvas.height / totalPages;
        
        // Create a temporary canvas for this page portion
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;
        
        const pageCtx = pageCanvas.getContext('2d');
        pageCtx.drawImage(
            canvas,
            0, sourceY, canvas.width, sourceHeight, // source
            0, 0, canvas.width, sourceHeight        // destination
        );
        
        const pageImgData = pageCanvas.toDataURL('image/png', 0.8);
        pdf.addImage(pageImgData, 'PNG', 0, 0, imgWidth, pageHeight);
    }
}

/**
 * Populate the selected template with form data
 * @param {Object} formData - The form data to populate
 */
function populateTemplate(formData) {
    try {
        const template = formData.template;
        
        // Populate basic information
        document.getElementById(`pdf-name-${template}`).textContent = formData.name;
        document.getElementById(`pdf-address-${template}`).textContent = formData.address;
        document.getElementById(`pdf-phone-${template}`).textContent = formData.phone;
        document.getElementById(`pdf-email-${template}`).textContent = formData.email;
        
        // Populate About section if content exists
        if (formData.about && formData.about.trim()) {
            document.getElementById(`pdf-about-${template}`).innerHTML = 
                formData.about.replace(/\n/g, '<br>');
            document.getElementById(`about-section-${template}`).style.display = 'block';
        } else {
            document.getElementById(`about-section-${template}`).style.display = 'none';
        }
        
        // Populate photo only if included
        if (formData.includePhoto && formData.photo) {
            const photoElement = document.getElementById(`pdf-photo-${template}`);
            photoElement.src = formData.photo;
            photoElement.alt = `${formData.name}'s profile photo`;
            photoElement.style.display = 'block';
        } else {
            // Hide photo container if not included
            const photoElement = document.getElementById(`pdf-photo-${template}`);
            if (photoElement) {
                photoElement.style.display = 'none';
            }
            // Also hide photo container for classic template
            if (template === 'classic') {
                const headerElement = document.getElementById('classic-header');
                if (headerElement && !formData.includePhoto) {
                    headerElement.classList.add('no-photo');
                }
            }
        }
        
        // Populate experience only if content exists
        if (formData.experience && formData.experience.trim()) {
            document.getElementById(`pdf-experience-${template}`).innerHTML = 
                formData.experience.replace(/\n/g, '<br>');
            document.getElementById(`experience-section-${template}`).style.display = 'block';
        } else {
            document.getElementById(`experience-section-${template}`).style.display = 'none';
        }
        
        // Populate education only if content exists
        if (formData.education && formData.education.trim()) {
            document.getElementById(`pdf-education-${template}`).innerHTML = 
                formData.education.replace(/\n/g, '<br>');
            document.getElementById(`education-section-${template}`).style.display = 'block';
        } else {
            document.getElementById(`education-section-${template}`).style.display = 'none';
        }
        
        // Populate skills only if content exists
        if (formData.skills && formData.skills.trim()) {
            const skillsList = document.getElementById(`pdf-skills-${template}`);
            const skills = formData.skills.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0);
            skillsList.innerHTML = skills.map(skill => `<li>${escapeHtml(skill)}</li>`).join('');
            document.getElementById(`skills-section-${template}`).style.display = 'block';
        } else {
            document.getElementById(`skills-section-${template}`).style.display = 'none';
        }
        
        // Populate strengths only if content exists
        if (formData.strengths && formData.strengths.trim()) {
            document.getElementById(`pdf-strengths-${template}`).innerHTML = 
                formData.strengths.replace(/\n/g, '<br>');
            document.getElementById(`strengths-section-${template}`).style.display = 'block';
        } else {
            document.getElementById(`strengths-section-${template}`).style.display = 'none';
        }
        
        // Populate achievements only if content exists
        if (formData.achievements && formData.achievements.trim()) {
            document.getElementById(`pdf-achievements-${template}`).innerHTML = 
                formData.achievements.replace(/\n/g, '<br>');
            document.getElementById(`achievements-section-${template}`).style.display = 'block';
        } else {
            document.getElementById(`achievements-section-${template}`).style.display = 'none';
        }
        
        // Populate projects only if content exists
        if (formData.projects && formData.projects.trim()) {
            document.getElementById(`pdf-projects-${template}`).innerHTML = 
                formData.projects.replace(/\n/g, '<br>');
            document.getElementById(`projects-section-${template}`).style.display = 'block';
        } else {
            document.getElementById(`projects-section-${template}`).style.display = 'none';
        }
        
        // Populate certificates only if content exists
        if (formData.certificates && formData.certificates.trim()) {
            document.getElementById(`pdf-certificates-${template}`).innerHTML = 
                formData.certificates.replace(/\n/g, '<br>');
            document.getElementById(`certificates-section-${template}`).style.display = 'block';
        } else {
            document.getElementById(`certificates-section-${template}`).style.display = 'none';
        }
        
        // Populate custom section only if both title and content exist
        if (formData.customTitle && formData.customTitle.trim() && 
            formData.customContent && formData.customContent.trim()) {
            document.getElementById(`pdf-custom-title-${template}`).textContent = formData.customTitle;
            document.getElementById(`pdf-custom-content-${template}`).innerHTML = 
                formData.customContent.replace(/\n/g, '<br>');
            document.getElementById(`custom-section-${template}`).style.display = 'block';
        } else {
            document.getElementById(`custom-section-${template}`).style.display = 'none';
        }
        
    } catch (error) {
        console.error('Template population error:', error);
        throw new Error('Failed to populate template with form data');
    }
}

/**
 * Wait for resources (fonts, images) to load
 * @returns {Promise} - Resolves when resources are loaded
 */
function waitForResources() {
    return new Promise((resolve) => {
        // Wait for fonts
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => {
                // Additional delay to ensure everything is rendered
                setTimeout(resolve, 500);
            });
        } else {
            // Fallback for older browsers
            setTimeout(resolve, 1000);
        }
    });
}

/* ==========================================
   Data Persistence Functions
   ========================================== */

/**
 * Save form progress to localStorage
 */
function saveProgress() {
    try {
        const formData = collectFormData();
        if (formData) {
            localStorage.setItem(ResumeBuilder.LOCAL_STORAGE_KEY, JSON.stringify(formData));
            showMessage('Progress saved successfully!', 'success');
            announceToScreenReader('Form progress saved');
        }
    } catch (error) {
        console.error('Save progress error:', error);
        showMessage('Failed to save progress', 'error');
    }
}

/**
 * Auto-save form data (called on input changes)
 */
function autoSave() {
    try {
        const formData = collectFormData();
        if (formData) {
            localStorage.setItem(ResumeBuilder.LOCAL_STORAGE_KEY + '_auto', JSON.stringify(formData));
            console.log('Auto-saved form data');
        }
    } catch (error) {
        console.warn('Auto-save failed:', error);
    }
}

/**
 * Load saved form data
 */
function loadSavedData() {
    try {
        // Try to load manually saved data first
        let savedData = localStorage.getItem(ResumeBuilder.LOCAL_STORAGE_KEY);
        
        // If no manual save, try auto-saved data
        if (!savedData) {
            savedData = localStorage.getItem(ResumeBuilder.LOCAL_STORAGE_KEY + '_auto');
        }
        
        if (savedData) {
            const formData = JSON.parse(savedData);
            populateFormFields(formData);
            
            // Load template selection
            if (formData.template) {
                ResumeBuilder.currentTemplate = formData.template;
                const templateRadio = document.querySelector(`input[name="template"][value="${formData.template}"]`);
                if (templateRadio) {
                    templateRadio.checked = true;
                }
            }
            
            console.log('Loaded saved form data');
        }
        
        // Load saved template choice
        loadSavedTemplate();
        
    } catch (error) {
        console.warn('Failed to load saved data:', error);
    }
}

/**
 * Populate form fields with saved data
 * @param {Object} data - The saved form data
 */
function populateFormFields(data) {
    Object.keys(ResumeBuilder.elements.fields).forEach(fieldName => {
        const field = ResumeBuilder.elements.fields[fieldName];
        if (field && data[fieldName]) {
            field.value = data[fieldName];
        }
    });
    
    // Handle photo
    if (data.photo && data.photo !== createDefaultPhotoDataURL()) {
        ResumeBuilder.elements.photoPreview.src = data.photo;
    }
    
    // Handle checkbox states
    if (data.hasOwnProperty('includePhoto')) {
        ResumeBuilder.elements.includePhoto.checked = data.includePhoto;
        togglePhotoSection();
    }
    
    if (data.hasOwnProperty('includeExperience')) {
        ResumeBuilder.elements.includeExperience.checked = data.includeExperience;
        toggleExperienceSection();
    }
    
    if (data.hasOwnProperty('includeProjects')) {
        ResumeBuilder.elements.includeProjects.checked = data.includeProjects;
        toggleProjectsSection();
    }
    
    if (data.hasOwnProperty('includeCertificates')) {
        ResumeBuilder.elements.includeCertificates.checked = data.includeCertificates;
        toggleCertificatesSection();
    }
    
    if (data.hasOwnProperty('includeCustom')) {
        ResumeBuilder.elements.includeCustom.checked = data.includeCustom;
        toggleCustomSection();
    }
}

/**
 * Save successful generation data for analytics
 * @param {Object} formData - The form data that was successfully generated
 */
function saveSuccessfulGeneration(formData) {
    try {
        const generationData = {
            timestamp: new Date().toISOString(),
            template: formData.template,
            name: formData.name // For file naming consistency
        };
        
        localStorage.setItem('lastGeneration', JSON.stringify(generationData));
    } catch (error) {
        console.warn('Failed to save generation data:', error);
    }
}

/* ==========================================
   UI Helper Functions
   ========================================== */

/**
 * Show message to user
 * @param {string} message - Message to display
 * @param {string} type - Message type: 'success', 'error', 'warning'
 */
function showMessage(message, type = 'info') {
    const container = ResumeBuilder.elements.messageContainer;
    
    container.textContent = message;
    container.className = `${type}`;
    container.classList.remove('hidden');
    
    // Auto-hide success messages
    if (type === 'success') {
        setTimeout(() => {
            container.classList.add('hidden');
        }, 5000);
    }
    
    // Scroll to message
    container.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Show loading indicator
 * @param {string} message - Loading message
 */
function showLoading(message = 'Processing...') {
    const indicator = ResumeBuilder.elements.loadingIndicator;
    const messageElement = indicator.querySelector('p');
    
    if (messageElement) {
        messageElement.textContent = message;
    }
    
    indicator.classList.remove('hidden');
    indicator.setAttribute('aria-hidden', 'false');
    
    // Disable form
    ResumeBuilder.elements.form.style.pointerEvents = 'none';
    ResumeBuilder.elements.form.style.opacity = '0.6';
}

/**
 * Hide loading indicator
 */
function hideLoading() {
    const indicator = ResumeBuilder.elements.loadingIndicator;
    
    indicator.classList.add('hidden');
    indicator.setAttribute('aria-hidden', 'true');
    
    // Re-enable form
    ResumeBuilder.elements.form.style.pointerEvents = 'auto';
    ResumeBuilder.elements.form.style.opacity = '1';
}

/**
 * Scroll to first error field
 */
function scrollToFirstError() {
    const firstError = document.querySelector('.form-group.error');
    if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Focus the field for keyboard users
        const field = firstError.querySelector('input, textarea');
        if (field) {
            setTimeout(() => field.focus(), 500);
        }
    }
}

/**
 * Announce message to screen readers
 * @param {string} message - Message to announce
 */
function announceToScreenReader(message) {
    const liveRegion = document.getElementById('live-region');
    if (liveRegion) {
        liveRegion.textContent = message;
        
        // Clear after announcement
        setTimeout(() => {
            liveRegion.textContent = '';
        }, 1000);
    }
}

/* ==========================================
   Keyboard and Accessibility Functions
   ========================================== */

/**
 * Handle keyboard shortcuts
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleKeyboardShortcuts(event) {
    // Ctrl+S or Cmd+S to save progress
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        saveProgress();
        return;
    }
    
    // Ctrl+Enter or Cmd+Enter to generate PDF
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        if (!ResumeBuilder.isGenerating) {
            ResumeBuilder.elements.form.dispatchEvent(new Event('submit'));
        }
        return;
    }
    
    // Escape to dismiss messages
    if (event.key === 'Escape') {
        const messageContainer = ResumeBuilder.elements.messageContainer;
        if (!messageContainer.classList.contains('hidden')) {
            messageContainer.classList.add('hidden');
        }
    }
}

/**
 * Handle page unload to prevent data loss
 * @param {BeforeUnloadEvent} event - Before unload event
 */
function handleBeforeUnload(event) {
    // Check if form has unsaved changes
    const currentData = collectFormData();
    const savedData = localStorage.getItem(ResumeBuilder.LOCAL_STORAGE_KEY);
    
    if (currentData && (!savedData || JSON.stringify(currentData) !== savedData)) {
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return event.returnValue;
    }
}

/* ==========================================
   Utility Functions
   ========================================== */

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Check if required external libraries are loaded
 * @returns {boolean} - True if all libraries are loaded
 */
function checkLibraries() {
    if (typeof html2canvas === 'undefined') {
        console.error('html2canvas library not loaded');
        return false;
    }
    
    if (typeof jspdf === 'undefined') {
        console.error('jsPDF library not loaded');
        return false;
    }
    
    return true;
}

/* ==========================================
   Error Handling and Recovery
   ========================================== */

/**
 * Global error handler
 */
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    showMessage('An unexpected error occurred. Please refresh the page if problems persist.', 'error');
});

/**
 * Handle unhandled promise rejections
 */
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    showMessage('An error occurred while processing your request.', 'error');
    event.preventDefault();
});

/* ==========================================
   Development and Debug Functions
   ========================================== */

/**
 * Debug function to log current application state
 */
function debugState() {
    console.log('Resume Builder State:', {
        currentTemplate: ResumeBuilder.currentTemplate,
        isGenerating: ResumeBuilder.isGenerating,
        formData: collectFormData(),
        librariesLoaded: checkLibraries()
    });
}

// Make debug function available globally in development
if (typeof window !== 'undefined') {
    window.debugResumeBuilder = debugState;
}

console.log('Resume Builder script loaded successfully');