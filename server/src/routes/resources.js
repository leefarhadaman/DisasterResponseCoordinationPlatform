import express from 'express';
import { validate, resourceSchema, resourceQuerySchema } from '../utils/validation.js';
import { findNearbyResources } from '../services/supabase.js';

const router = express.Router();

// POST /resources - Create a new resource
router.post('/', validate(resourceSchema), async (req, res, next) => {
  try {
    const { supabase, io, logger, user } = req;
    const { name, location_name, type, lat, lon, disaster_id } = req.body;

    // Prepare location data
    let location = null;
    if (lat && lon) {
      location = `POINT(${lon} ${lat})`;
    }

    const { data, error } = await supabase
      .from('resources')
      .insert({
        name,
        location_name,
        type,
        location,
        disaster_id
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create resource: ${error.message}`);
    }

    logger.info({
      msg: 'Resource created',
      module: 'resources',
      resourceId: data.id,
      disasterId: disaster_id,
      userId: user.id
    });

    // Emit real-time update
    io.emit('resources_updated', {
      type: 'created',
      resource: data
    });

    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

// GET /resources - List resources with optional filtering
router.get('/', validate(resourceQuerySchema), async (req, res, next) => {
  try {
    const { supabase, logger } = req;
    const { disaster_id, type, lat, lon, radius = 10 } = req.query;

    let query = supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });

    if (disaster_id) {
      query = query.eq('disaster_id', disaster_id);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch resources: ${error.message}`);
    }

    // If coordinates provided, filter by distance
    let filteredData = data;
    if (lat && lon) {
      try {
        const nearbyResources = await findNearbyResources(
          parseFloat(lat), 
          parseFloat(lon), 
          parseFloat(radius)
        );
        
        // Create a set of nearby resource IDs for efficient filtering
        const nearbyIds = new Set(nearbyResources.map(r => r.id));
        filteredData = data.filter(resource => nearbyIds.has(resource.id));
      } catch (geoError) {
        logger.warn({
          msg: 'Geospatial filtering failed, returning all resources',
          module: 'resources',
          error: geoError.message
        });
      }
    }

    logger.info({
      msg: 'Resources fetched',
      module: 'resources',
      count: filteredData.length,
      disasterId: disaster_id,
      type: type || 'all'
    });

    res.json(filteredData);
  } catch (error) {
    next(error);
  }
});

// GET /resources/:id - Get a specific resource
router.get('/:id', async (req, res, next) => {
  try {
    const { supabase, logger } = req;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Resource not found' });
      }
      throw new Error(`Failed to fetch resource: ${error.message}`);
    }

    logger.info({
      msg: 'Resource fetched',
      module: 'resources',
      resourceId: id
    });

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// PUT /resources/:id - Update a resource
router.put('/:id', validate(resourceSchema), async (req, res, next) => {
  try {
    const { supabase, io, logger, user } = req;
    const { id } = req.params;
    const { name, location_name, type, lat, lon, disaster_id } = req.body;

    // First, get the current resource
    const { data: existing, error: fetchError } = await supabase
      .from('resources')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Resource not found' });
      }
      throw new Error(`Failed to fetch resource: ${fetchError.message}`);
    }

    // Prepare location data
    let location = null;
    if (lat && lon) {
      location = `POINT(${lon} ${lat})`;
    }

    const { data, error } = await supabase
      .from('resources')
      .update({
        name,
        location_name,
        type,
        location,
        disaster_id
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update resource: ${error.message}`);
    }

    logger.info({
      msg: 'Resource updated',
      module: 'resources',
      resourceId: id,
      userId: user.id
    });

    // Emit real-time update
    io.emit('resources_updated', {
      type: 'updated',
      resource: data
    });

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// DELETE /resources/:id - Delete a resource
router.delete('/:id', async (req, res, next) => {
  try {
    const { supabase, io, logger, user } = req;
    const { id } = req.params;

    // First, get the resource to check if it exists
    const { data: existing, error: fetchError } = await supabase
      .from('resources')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Resource not found' });
      }
      throw new Error(`Failed to fetch resource: ${fetchError.message}`);
    }

    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete resource: ${error.message}`);
    }

    logger.info({
      msg: 'Resource deleted',
      module: 'resources',
      resourceId: id,
      userId: user.id
    });

    // Emit real-time update
    io.emit('resources_updated', {
      type: 'deleted',
      resourceId: id
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// GET /resources/nearby - Find resources near a specific location
router.get('/nearby', async (req, res, next) => {
  try {
    const { logger } = req;
    const { lat, lon, radius = 10, type } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    logger.info({
      msg: 'Nearby resources requested',
      module: 'resources',
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      radius: parseFloat(radius),
      type: type || 'all'
    });

    const nearbyResources = await findNearbyResources(
      parseFloat(lat), 
      parseFloat(lon), 
      parseFloat(radius)
    );

    // Filter by type if specified
    let filteredResources = nearbyResources;
    if (type) {
      filteredResources = nearbyResources.filter(resource => resource.type === type);
    }

    res.json(filteredResources);
  } catch (error) {
    next(error);
  }
});

// GET /resources/types - Get all available resource types
router.get('/types', async (req, res, next) => {
  try {
    const { supabase, logger } = req;

    const { data, error } = await supabase
      .from('resources')
      .select('type')
      .not('type', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch resource types: ${error.message}`);
    }

    // Get unique types
    const types = [...new Set(data.map(item => item.type))].sort();

    logger.info({
      msg: 'Resource types fetched',
      module: 'resources',
      count: types.length
    });

    res.json(types);
  } catch (error) {
    next(error);
  }
});

// POST /resources/bulk - Create multiple resources at once
router.post('/bulk', async (req, res, next) => {
  try {
    const { supabase, io, logger, user } = req;
    const { resources } = req.body;

    if (!Array.isArray(resources) || resources.length === 0) {
      return res.status(400).json({ error: 'Resources array is required' });
    }

    // Validate each resource
    const validatedResources = resources.map(resource => {
      const { name, location_name, type, lat, lon, disaster_id } = resource;
      
      if (!name || !location_name || !type || !disaster_id) {
        throw new Error('Missing required fields for resource');
      }

      let location = null;
      if (lat && lon) {
        location = `POINT(${lon} ${lat})`;
      }

      return {
        name,
        location_name,
        type,
        location,
        disaster_id
      };
    });

    const { data, error } = await supabase
      .from('resources')
      .insert(validatedResources)
      .select();

    if (error) {
      throw new Error(`Failed to create resources: ${error.message}`);
    }

    logger.info({
      msg: 'Bulk resources created',
      module: 'resources',
      count: data.length,
      userId: user.id
    });

    // Emit real-time updates for each resource
    data.forEach(resource => {
      io.emit('resources_updated', {
        type: 'created',
        resource
      });
    });

    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

export default router; 