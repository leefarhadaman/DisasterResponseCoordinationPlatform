import express from 'express';
import { validate, disasterSchema, disasterQuerySchema } from '../utils/validation.js';

const router = express.Router();

// POST /disasters - Create a new disaster
router.post('/', validate(disasterSchema), async (req, res, next) => {
  try {
    const { supabase, io, logger, user } = req;
    const { title, location_name, description, tags, lat, lon } = req.body;

    // Prepare location data
    let location = null;
    if (lat && lon) {
      location = `POINT(${lon} ${lat})`;
    }

    const { data, error } = await supabase
      .from('disasters')
      .insert({
        title,
        location_name,
        description,
        tags: tags || [],
        location,
        owner_id: user.id,
        audit_trail: [{
          action: 'created',
          user_id: user.id,
          timestamp: new Date().toISOString()
        }]
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create disaster: ${error.message}`);
    }

    logger.info({
      msg: 'Disaster created',
      module: 'disasters',
      disasterId: data.id,
      userId: user.id
    });

    // Emit real-time update
    io.emit('disaster_updated', {
      type: 'created',
      disaster: data
    });

    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

// GET /disasters - List disasters with optional filtering
router.get('/', validate(disasterQuerySchema), async (req, res, next) => {
  try {
    const { supabase, logger } = req;
    const { tag, limit = 20, offset = 0 } = req.query;

    let query = supabase
      .from('disasters')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch disasters: ${error.message}`);
    }

    logger.info({
      msg: 'Disasters fetched',
      module: 'disasters',
      count: data.length,
      tag: tag || 'all'
    });

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// GET /disasters/:id - Get a specific disaster
router.get('/:id', async (req, res, next) => {
  try {
    const { supabase, logger } = req;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('disasters')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Disaster not found' });
      }
      throw new Error(`Failed to fetch disaster: ${error.message}`);
    }

    logger.info({
      msg: 'Disaster fetched',
      module: 'disasters',
      disasterId: id
    });

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// PUT /disasters/:id - Update a disaster
router.put('/:id', validate(disasterSchema), async (req, res, next) => {
  try {
    const { supabase, io, logger, user } = req;
    const { id } = req.params;
    const { title, location_name, description, tags, lat, lon } = req.body;

    // First, get the current disaster to check ownership
    const { data: existing, error: fetchError } = await supabase
      .from('disasters')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Disaster not found' });
      }
      throw new Error(`Failed to fetch disaster: ${fetchError.message}`);
    }

    // Check ownership (admin can edit any disaster)
    if (existing.owner_id !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Prepare location data
    let location = null;
    if (lat && lon) {
      location = `POINT(${lon} ${lat})`;
    }

    // Update audit trail
    const auditTrail = existing.audit_trail || [];
    auditTrail.push({
      action: 'updated',
      user_id: user.id,
      timestamp: new Date().toISOString(),
      changes: { title, location_name, description, tags }
    });

    const { data, error } = await supabase
      .from('disasters')
      .update({
        title,
        location_name,
        description,
        tags: tags || [],
        location,
        audit_trail: auditTrail
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update disaster: ${error.message}`);
    }

    logger.info({
      msg: 'Disaster updated',
      module: 'disasters',
      disasterId: id,
      userId: user.id
    });

    // Emit real-time update
    io.emit('disaster_updated', {
      type: 'updated',
      disaster: data
    });

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// DELETE /disasters/:id - Delete a disaster
router.delete('/:id', async (req, res, next) => {
  try {
    const { supabase, io, logger, user } = req;
    const { id } = req.params;

    // First, get the disaster to check ownership
    const { data: existing, error: fetchError } = await supabase
      .from('disasters')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Disaster not found' });
      }
      throw new Error(`Failed to fetch disaster: ${fetchError.message}`);
    }

    // Check ownership (admin can delete any disaster)
    if (existing.owner_id !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { error } = await supabase
      .from('disasters')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete disaster: ${error.message}`);
    }

    logger.info({
      msg: 'Disaster deleted',
      module: 'disasters',
      disasterId: id,
      userId: user.id
    });

    // Emit real-time update
    io.emit('disaster_updated', {
      type: 'deleted',
      disasterId: id
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// GET /disasters/:id/social-media - Get social media feed for a disaster
router.get('/:id/social-media', async (req, res, next) => {
  try {
    const { logger } = req;
    const { id } = req.params;

    // This will be implemented in the social media routes
    // For now, return a placeholder
    const mockSocialMedia = [
      {
        id: '1',
        platform: 'twitter',
        content: 'Heavy flooding reported in the area. Stay safe everyone!',
        author: '@local_reporter',
        timestamp: new Date().toISOString(),
        verified: false
      },
      {
        id: '2',
        platform: 'twitter',
        content: 'Emergency services are responding to the scene.',
        author: '@emergency_services',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        verified: true
      }
    ];

    logger.info({
      msg: 'Social media feed fetched',
      module: 'disasters',
      disasterId: id
    });

    res.json(mockSocialMedia);
  } catch (error) {
    next(error);
  }
});

// GET /disasters/:id/official-updates - Get official updates for a disaster
router.get('/:id/official-updates', async (req, res, next) => {
  try {
    const { logger } = req;
    const { id } = req.params;

    // This will be implemented with web scraping
    // For now, return a placeholder
    const mockOfficialUpdates = [
      {
        id: '1',
        source: 'City Emergency Management',
        title: 'Evacuation Order Issued',
        content: 'Residents in affected areas are ordered to evacuate immediately.',
        timestamp: new Date().toISOString(),
        priority: 'high'
      }
    ];

    logger.info({
      msg: 'Official updates fetched',
      module: 'disasters',
      disasterId: id
    });

    res.json(mockOfficialUpdates);
  } catch (error) {
    next(error);
  }
});

// POST /disasters/:id/verify-image - Verify an image for a disaster
router.post('/:id/verify-image', async (req, res, next) => {
  try {
    const { supabase, logger, user } = req;
    const { id } = req.params;
    const { image_url } = req.body;

    // This will be implemented with Gemini API
    // For now, return a mock verification
    const verificationResult = {
      verified: true,
      confidence: 0.85,
      analysis: 'Image appears to be authentic with no signs of manipulation',
      timestamp: new Date().toISOString()
    };

    // Store the verification result in reports table
    const { data, error } = await supabase
      .from('reports')
      .insert({
        disaster_id: id,
        user_id: user.id,
        content: 'Image verification completed',
        image_url,
        verification_status: verificationResult.verified ? 'verified' : 'suspicious'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to store verification result: ${error.message}`);
    }

    logger.info({
      msg: 'Image verification completed',
      module: 'disasters',
      disasterId: id,
      userId: user.id,
      verified: verificationResult.verified
    });

    res.json({
      report: data,
      verification: verificationResult
    });
  } catch (error) {
    next(error);
  }
});

export default router; 