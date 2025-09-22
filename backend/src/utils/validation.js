
// Backend validation utilities with regex patterns and sanitization
import xss from "xss";

// Validation rules with regex patterns
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
  postContent: {
    pattern: /^(?!.*<script|.*javascript:|.*on\w+\s*=)[^<>]*$/i,
    message: "Content contains invalid characters"
  },
  
  // Comment validation: Similar to post content but shorter
  comment: {
    pattern: /^(?!.*<script|.*javascript:|.*on\w+\s*=)[^<>]{1,1000}$/i,
    message: "Comment must be 1-1000 characters and contain no HTML"
  }
};

// Sanitize input using xss library to neutralize scripts but keep as string
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  // xss will encode tags so <script> becomes &lt;script&gt; and is safe as a string
  return xss(input, { whiteList: {}, stripIgnoreTag: false, stripIgnoreTagBody: ["script"] }).trim();
};

// Validate and sanitize a single field
export const validateField = (fieldName, value) => {
  if (!value || typeof value !== 'string') {
    return { 
      isValid: false, 
      error: `${fieldName} is required`,
      sanitizedValue: value 
    };
  }

  const sanitizedValue = sanitizeInput(value);
  
  // Check if sanitization changed the value (indicates malicious content)
  if (sanitizedValue !== value) {
    return { 
      isValid: false, 
      error: `${fieldName} contains invalid characters`,
      sanitizedValue: sanitizedValue
    };
  }

  const rule = validationRules[fieldName] || validationRules[fieldName.replace(/([A-Z])/g, '_$1').toLowerCase()];
  
  // For firstName and lastName, use the name rule
  if ((fieldName === 'firstName' || fieldName === 'lastName') && validationRules.name) {
    if (!validationRules.name.pattern.test(sanitizedValue)) {
      return { 
        isValid: false, 
        error: validationRules.name.message,
        sanitizedValue: sanitizedValue
      };
    }
  } else if (rule && !rule.pattern.test(sanitizedValue)) {
    return { 
      isValid: false, 
      error: rule.message,
      sanitizedValue: sanitizedValue
    };
  }

  return { 
    isValid: true, 
    error: null, 
    sanitizedValue: sanitizedValue 
  };
};

// Validate multiple fields
export const validateForm = (formData, fieldsToValidate = []) => {
  const errors = {};
  const sanitizedData = {};
  let isValid = true;

  // If no specific fields provided, validate all known fields
  if (fieldsToValidate.length === 0) {
    fieldsToValidate = Object.keys(formData);
  }

  for (const fieldName of fieldsToValidate) {
    const value = formData[fieldName];
    
    if (value !== undefined && value !== null) {
      const validation = validateField(fieldName, value);
      
      if (!validation.isValid) {
        errors[fieldName] = validation.error;
        isValid = false;
      }
      
      sanitizedData[fieldName] = validation.sanitizedValue;
    } else if (typeof value === 'string') {
      sanitizedData[fieldName] = value;
    }
  }

  // Copy over non-validated fields
  for (const [key, value] of Object.entries(formData)) {
    if (!fieldsToValidate.includes(key)) {
      sanitizedData[key] = value;
    }
  }

  return { isValid, errors, sanitizedData };
};

// Express middleware for validating request body
export const validateRequestBody = (fieldsToValidate) => {
  return (req, res, next) => {
    const validation = validateForm(req.body, fieldsToValidate);
    
    if (!validation.isValid) {
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: validation.errors ,
        isValid: false
      });
    }
    
    // Replace request body with sanitized data
    req.body = validation.sanitizedData;
    next();
  };
};
