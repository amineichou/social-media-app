// Input validation utilities with regex patterns

export const validationRules = {
  // Name validation: Only letters, spaces, hyphens, and apostrophes (2-50 chars)
  name: {
    pattern: /^[a-zA-Z\s\-']{2,50}$/,
    message: "Name must contain only letters, spaces, hyphens, and apostrophes (2-50 characters)"
  },
  
  // Username validation: Letters, numbers, underscores, hyphens (3-30 chars)
  username: {
    pattern: /^[a-zA-Z0-9_-]{3,30}$/,
    message: "Username must contain only letters, numbers, underscores, and hyphens (3-30 characters)"
  },
  
  // Email validation: Standard email format
  email: {
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    message: "Please enter a valid email address"
  },
  
  // Password validation: At least 8 chars, 1 uppercase, 1 lowercase, 1 number
  password: {
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
    message: "Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number"
  },
  
  // Post content validation: No script tags or dangerous HTML
  // postContent: {
  //   pattern: /^(?!.*<script|.*javascript:|.*on\w+\s*=)[^<>]*$/i,
  //   message: "Content contains invalid characters"
  // }
};

// Sanitize input by removing dangerous characters
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
};

// Validate single field
export const validateField = (fieldName, value) => {
  if (!value || typeof value !== 'string') {
    return { isValid: false, error: `${fieldName} is required` };
  }

  const sanitizedValue = sanitizeInput(value);
  
  // Check if sanitization changed the value (indicates malicious content)
  if (sanitizedValue !== value) {
    return { 
      isValid: false, 
      error: `${fieldName} contains invalid characters` 
    };
  }

  const rule = validationRules[fieldName];
  if (rule && !rule.pattern.test(sanitizedValue)) {
    return { isValid: false, error: rule.message };
  }

  return { isValid: true, error: null, sanitizedValue };
};

// Validate multiple fields
export const validateForm = (formData, fieldRules) => {
  const errors = {};
  const sanitizedData = {};
  let isValid = true;

  for (const [fieldName, value] of Object.entries(formData)) {
    if (fieldRules.includes(fieldName)) {
      const validation = validateField(fieldName, value);
      
      if (!validation.isValid) {
        errors[fieldName] = validation.error;
        isValid = false;
      } else {
        sanitizedData[fieldName] = validation.sanitizedValue;
      }
    } else {
      sanitizedData[fieldName] = value;
    }
  }

  return { isValid, errors, sanitizedData };
};

// Real-time input handler with validation
export const createValidatedInputHandler = (setFormData, setErrors) => {
  return (e) => {
    const { name, value } = e.target;
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field and validate
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[name];
      
      // Validate field if it has a rule
      if (validationRules[name]) {
        const validation = validateField(name, value);
        if (!validation.isValid) {
          newErrors[name] = validation.error;
        }
      }
      
      return newErrors;
    });
  };
};
