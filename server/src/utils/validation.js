import { z } from 'zod';

// Disaster creation/update schema
export const disasterSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  location_name: z.string().min(1, 'Location name is required').max(200),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional()
});

// Report creation schema
export const reportSchema = z.object({
  content: z.string().min(1, 'Content is required').max(1000),
  image_url: z.string().url().optional(),
  disaster_id: z.string().uuid('Invalid disaster ID')
});

// Resource creation schema
export const resourceSchema = z.object({
  name: z.string().min(1, 'Resource name is required').max(200),
  location_name: z.string().min(1, 'Location name is required').max(200),
  type: z.string().min(1, 'Resource type is required').max(100),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
  disaster_id: z.string().uuid('Invalid disaster ID')
});

// Geocoding request schema
export const geocodeSchema = z.object({
  text: z.string().min(1, 'Text is required').max(500)
});

// Image verification schema
export const imageVerificationSchema = z.object({
  image_url: z.string().url('Invalid image URL'),
  disaster_id: z.string().uuid('Invalid disaster ID')
});

// Query parameters for disasters
export const disasterQuerySchema = z.object({
  tag: z.string().optional(),
  limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
  offset: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(0)).optional()
});

// Query parameters for resources
export const resourceQuerySchema = z.object({
  lat: z.string().transform(val => parseFloat(val)).pipe(z.number().min(-90).max(90)).optional(),
  lon: z.string().transform(val => parseFloat(val)).pipe(z.number().min(-180).max(180)).optional(),
  radius: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0.1).max(100)).optional()
});

// Validation middleware factory
export function validate(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse({
        ...req.body,
        ...req.query,
        ...req.params
      });
      
      // Replace the request data with validated data
      req.body = { ...req.body, ...validated };
      req.query = { ...req.query, ...validated };
      req.params = { ...req.params, ...validated };
      
      next();
    } catch (error) {
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.details = error.errors;
      next(validationError);
    }
  };
} 