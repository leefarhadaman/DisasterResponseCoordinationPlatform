import { createClient } from '@supabase/supabase-js';

let supabase = null;

export function initializeSupabase() {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Check if we have valid Supabase credentials (not placeholder values)
    const hasValidCredentials = supabaseUrl && 
                               supabaseKey && 
                               supabaseUrl !== 'your_supabase_url_here' && 
                               supabaseKey !== 'your_supabase_service_role_key_here';

    if (!hasValidCredentials) {
      console.warn('⚠️  Missing or invalid Supabase environment variables. Using mock mode for development.');
      console.warn('   To use real Supabase, set valid SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
      
      // Return a mock client for development
      return createMockSupabaseClient();
    }

    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabase;
}

// Mock Supabase client for development
function createMockSupabaseClient() {
  console.log('🔧 Using mock Supabase client for development');
  
  return {
    from: (table) => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
          order: () => ({
            range: () => Promise.resolve({ data: [], error: null })
          })
        }),
        insert: (data) => ({
          select: () => ({
            single: () => Promise.resolve({ 
              data: { 
                id: 'mock-id-' + Date.now(), 
                ...data,
                created_at: new Date().toISOString()
              }, 
              error: null 
            })
          })
        }),
        update: (data) => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ 
                data: { 
                  id: 'mock-id-' + Date.now(), 
                  ...data,
                  updated_at: new Date().toISOString()
                }, 
                error: null 
              })
            })
          })
        }),
        delete: () => ({
          eq: () => Promise.resolve({ error: null })
        }),
        contains: () => ({
          order: () => ({
            range: () => Promise.resolve({ data: [], error: null })
          })
        }),
        filter: () => ({
          order: () => Promise.resolve({ data: [], error: null })
        }),
        not: () => ({
          select: () => Promise.resolve({ data: [], error: null })
        }),
        lt: () => Promise.resolve({ error: null }),
        upsert: () => Promise.resolve({ error: null })
      })
    })
  };
}

// Caching utility as specified in the requirements
export async function getOrSetCache(key, fetcher, ttlHours = 1) {
  const supabaseClient = initializeSupabase();
  
  // For mock mode, just call the fetcher directly
  const hasValidCredentials = process.env.SUPABASE_URL && 
                             process.env.SUPABASE_URL !== 'your_supabase_url_here';
  
  if (!hasValidCredentials) {
    console.log('🔧 Mock mode: skipping cache, calling fetcher directly');
    return await fetcher();
  }

  const { data } = await supabaseClient
    .from('cache')
    .select('value, expires_at')
    .eq('key', key)
    .single();

  if (data && new Date(data.expires_at) > new Date()) {
    return data.value; // cache hit
  }

  const fresh = await fetcher();
  
  await supabaseClient.from('cache').upsert({
    key,
    value: fresh,
    expires_at: new Date(Date.now() + ttlHours * 60 * 60 * 1000)
  });

  return fresh;
}

// Geospatial query utility for finding nearby resources
export async function findNearbyResources(lat, lon, radiusKm = 10) {
  const supabaseClient = initializeSupabase();
  
  // For mock mode, return empty array
  const hasValidCredentials = process.env.SUPABASE_URL && 
                             process.env.SUPABASE_URL !== 'your_supabase_url_here';
  
  if (!hasValidCredentials) {
    console.log('🔧 Mock mode: returning empty nearby resources');
    return [];
  }

  const { data, error } = await supabaseClient
    .from('resources')
    .select('*')
    .filter('location', 'st_dwithin', `POINT(${lon} ${lat})`, radiusKm * 1000);

  if (error) {
    throw new Error(`Geospatial query failed: ${error.message}`);
  }

  return data;
}

// Clean expired cache entries
export async function cleanExpiredCache() {
  const supabaseClient = initializeSupabase();
  
  // For mock mode, do nothing
  const hasValidCredentials = process.env.SUPABASE_URL && 
                             process.env.SUPABASE_URL !== 'your_supabase_url_here';
  
  if (!hasValidCredentials) {
    return;
  }

  const { error } = await supabaseClient
    .from('cache')
    .delete()
    .lt('expires_at', new Date().toISOString());

  if (error) {
    console.error('Failed to clean expired cache:', error);
  }
}

// Run cache cleanup every hour (only in production mode)
const hasValidCredentials = process.env.SUPABASE_URL && 
                           process.env.SUPABASE_URL !== 'your_supabase_url_here';

if (hasValidCredentials) {
  setInterval(cleanExpiredCache, 60 * 60 * 1000);
} 