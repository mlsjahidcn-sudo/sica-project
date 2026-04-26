import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { apiCache, CACHE_TTL } from '@/lib/api-cache';

// GET /api/universities/[id] - Get single university with caching
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check cache first
    const cacheKey = `university:${id}`;
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }
    
    // Initialize Supabase client
    const client = getSupabaseClient();

    // Fetch university by ID
    const { data, error } = await client
      .from('universities')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching university:', error);
      return NextResponse.json(
        { error: 'University not found', details: error.message },
        { status: 404 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'University not found' },
        { status: 404 }
      );
    }

    const response = { university: data };
    
    // Cache for 5 minutes (slower TTL for single items)
    apiCache.set(cacheKey, response, CACHE_TTL.LONG);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in university detail API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
