/**
 * Unified Query Builder System
 * 
 * Provides a consistent pattern for all database queries with:
 * - Typed query builders for each entity
 * - Common pagination, filtering, and sorting utilities
 * - Timeout handling
 * - Error handling
 */

import { getSupabaseClient } from '@/storage/database/supabase-client';
import { withTimeout } from '@/lib/api-cache';

// ============================================================================
// Types
// ============================================================================

/** Pagination parameters */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/** Sort parameters */
export interface SortParams {
  field: string;
  ascending?: boolean;
}

/** Filter parameters */
export interface FilterParams {
  [key: string]: string | string[] | boolean | null | undefined;
}

/** Base query options */
export interface QueryOptions {
  pagination?: PaginationParams;
  filters?: FilterParams;
  sort?: SortParams;
  timeout?: number;
}

/** Query result with count */
export interface QueryResult<T = any> {
  data: T[];
  count: number;
  error: Error | null;
}

/** Single result */
export interface SingleResult<T = any> {
  data: T | null;
  error: Error | null;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const LONG_TIMEOUT = 60000; // 60 seconds

// ============================================================================
// Base Query Builder
// ============================================================================

/**
 * Base query builder class for creating reusable query patterns
 */
export abstract class BaseQueryBuilder<T> {
  protected tableName: string;
  protected timeout: number = DEFAULT_TIMEOUT;

  constructor(tableName: string, timeout?: number) {
    this.tableName = tableName;
    if (timeout) this.timeout = timeout;
  }

  protected getSupabase() {
    return getSupabaseClient();
  }

  /**
   * Build pagination offset
   */
  protected getOffset(page?: number, limit?: number): { from: number; to: number } | null {
    if (page === undefined || limit === undefined) return null;
    return {
      from: (page - 1) * limit,
      to: page * limit - 1,
    };
  }

  /**
   * Apply pagination to query
   */
  protected applyPagination(query: any, options?: QueryOptions) {
    const offset = this.getOffset(options?.pagination?.page, options?.pagination?.limit);
    if (offset) {
      query.range(offset.from, offset.to);
    }
    return query;
  }

  /**
   * Apply filters to query
   */
  protected applyFilters(query: any, filters: FilterParams) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      
      if (Array.isArray(value)) {
        query.contains(key, value);
      } else if (typeof value === 'boolean') {
        query.eq(key, value);
      } else if (key.includes('.')) {
        query.eq(key, value);
      } else {
        query.eq(key, value);
      }
    });
    return query;
  }

  /**
   * Apply sorting to query
   */
  protected applySorting(query: any, sort?: SortParams) {
    if (sort) {
      query.order(sort.field, { ascending: sort.ascending ?? true, nullsFirst: false });
    }
    return query;
  }

  /**
   * Get list with pagination
   */
  async getList(options?: QueryOptions): Promise<QueryResult<T>> {
    const supabase = this.getSupabase();
    const timeout = options?.timeout || this.timeout;
    
    let countQuery = supabase
      .from(this.tableName)
      .select('id', { count: 'exact', head: true });

    let dataQuery = supabase
      .from(this.tableName)
      .select('*', { count: 'exact' });

    if (options?.filters) {
      countQuery = this.applyFilters(countQuery, options.filters);
      dataQuery = this.applyFilters(dataQuery, options.filters);
    }

    if (options?.sort) {
      countQuery = this.applySorting(countQuery, options.sort);
      dataQuery = this.applySorting(dataQuery, options.sort);
    } else {
      dataQuery = dataQuery.order('created_at', { ascending: false });
    }

    countQuery = this.applyPagination(countQuery, options);
    dataQuery = this.applyPagination(dataQuery, options);

    const [countResult, dataResult] = await Promise.all([
      withTimeout(countQuery, timeout, `${this.tableName} count query timed out`),
      withTimeout(dataQuery, timeout, `${this.tableName} list query timed out`),
    ]);

    return {
      data: (dataResult.data || []) as T[],
      count: countResult.count || 0,
      error: countResult.error || dataResult.error,
    };
  }

  /**
   * Get single record by ID
   */
  async getById(id: string, select?: string): Promise<SingleResult<T>> {
    const supabase = this.getSupabase();
    
    let query = supabase
      .from(this.tableName)
      .select(select || '*')
      .eq('id', id)
      .single();

    const { data, error } = await withTimeout(
      query,
      this.timeout,
      `${this.tableName} detail query timed out`
    );

    return { data: data as T | null, error };
  }

  /**
   * Create record
   */
  async create(data: Partial<T>): Promise<SingleResult<T>> {
    const supabase = this.getSupabase();
    
    const { data: result, error } = await withTimeout(
      supabase.from(this.tableName).insert(data).select().single(),
      this.timeout,
      `${this.tableName} create query timed out`
    );

    return { data: result as T | null, error };
  }

  /**
   * Update record
   */
  async update(id: string, data: Partial<T>): Promise<SingleResult<T>> {
    const supabase = this.getSupabase();
    
    const { data: result, error } = await withTimeout(
      supabase.from(this.tableName).update(data).eq('id', id).select().single(),
      this.timeout,
      `${this.tableName} update query timed out`
    );

    return { data: result as T | null, error };
  }

  /**
   * Delete record
   */
  async delete(id: string): Promise<{ error: Error | null }> {
    const supabase = this.getSupabase();
    
    const { error } = await withTimeout(
      supabase.from(this.tableName).delete().eq('id', id),
      this.timeout,
      `${this.tableName} delete query timed out`
    );

    return { error };
  }
}

// ============================================================================
// University Query Builder
// ============================================================================

export interface UniversityListParams {
  pagination?: PaginationParams;
  search?: string | null;
  province?: string | null;
  type?: string | null;
  category?: string | null;
  scholarship?: boolean | null;
  status?: string;
  sort?: SortParams;
}

/** University type (partial for list view) */
export type UniversityListItem = {
  id: string;
  name_en: string;
  name_cn: string;
  short_name: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  province: string | null;
  city: string | null;
  type: string | null;
  category: string | null;
  ranking_national: number | null;
  ranking_international: number | null;
  scholarship_available: boolean;
  student_count: number | null;
};

export interface University extends UniversityListItem {
  status: string;
  created_at: string;
}

export class UniversityQueryBuilder extends BaseQueryBuilder<UniversityListItem> {
  constructor() {
    super('universities');
  }

  async getList(params: UniversityListParams): Promise<QueryResult<UniversityListItem>> {
    const supabase = this.getSupabase();
    const { page = 1, limit = 12 } = params.pagination || {};
    const offset = (page - 1) * limit;

    const filters: FilterParams = {};
    if (params.status) filters.status = params.status;
    else filters.status = 'active';

    if (params.province) filters.province = params.province;
    if (params.type) filters.type = params.type;
    if (params.category) filters.category = params.category;
    if (params.scholarship !== null) filters.scholarship_available = params.scholarship;

    let countQuery = supabase
      .from('universities')
      .select('id', { count: 'exact', head: true })
      .eq('status', filters.status as string);

    let dataQuery = supabase
      .from('universities')
      .select(`
        id, name_en, name_cn, short_name, logo_url, cover_image_url,
        province, city, type, category, ranking_national, 
        ranking_international, scholarship_available, student_count
      `)
      .eq('status', filters.status as string);

    if (params.search) {
      const searchTerm = `%${params.search}%`;
      countQuery = countQuery.or(`name_en.ilike.${searchTerm},name_cn.ilike.${searchTerm}`);
      dataQuery = dataQuery.or(`name_en.ilike.${searchTerm},name_cn.ilike.${searchTerm}`);
    }

    if (params.province) {
      countQuery = countQuery.eq('province', params.province);
      dataQuery = dataQuery.eq('province', params.province);
    }
    if (params.type) {
      countQuery = countQuery.eq('type', params.type);
      dataQuery = dataQuery.eq('type', params.type);
    }
    if (params.category) {
      countQuery = countQuery.eq('category', params.category);
      dataQuery = dataQuery.eq('category', params.category);
    }
    if (params.scholarship !== null) {
      countQuery = countQuery.eq('scholarship_available', params.scholarship);
      dataQuery = dataQuery.eq('scholarship_available', params.scholarship);
    }

    if (params.sort) {
      dataQuery = dataQuery.order(params.sort.field, { ascending: params.sort.ascending ?? true });
    } else {
      dataQuery = dataQuery
        .order('ranking_national', { ascending: true, nullsFirst: false })
        .order('name_en', { ascending: true });
    }

    dataQuery = dataQuery.range(offset, offset + limit - 1);

    const [countResult, dataResult] = await Promise.all([
      withTimeout(countQuery, this.timeout, 'University count query timed out'),
      withTimeout(dataQuery, this.timeout, 'University list query timed out'),
    ]);

    return {
      data: (dataResult.data || []) as UniversityListItem[],
      count: countResult.count || 0,
      error: countResult.error || dataResult.error,
    };
  }

  async getByIdWithRelations(id: string): Promise<SingleResult<University & { programs?: any[] }>> {
    const supabase = this.getSupabase();
    
    const { data, error } = await withTimeout(
      supabase
        .from('universities')
        .select(`
          *,
          programs (
            id, name, degree_level, language, tuition_fee_per_year
          )
        `)
        .eq('id', id)
        .single(),
      this.timeout,
      'University with relations query timed out'
    );

    return { data: data as University & { programs?: any[] } | null, error };
  }
}

// ============================================================================
// Program Query Builder
// ============================================================================

export interface ProgramListParams {
  pagination?: PaginationParams;
  search?: string | null;
  university_id?: string | null;
  degree_level?: string | null;
  language?: string | null;
  category?: string | null;
  scholarship?: boolean | null;
  is_active?: boolean;
}

/** Program type (partial for list view with relations) */
export type ProgramListItem = {
  id: string;
  name: string;
  degree_level: string | null;
  language: string[];
  category: string | null;
  tuition_fee_per_year: number | null;
  currency: string | null;
  scholarship_coverage: number | null;
  duration_years: number | null;
  is_active: boolean;
  universities?: { id: string; name_en: string; name_cn: string; city: string; province: string; logo_url: string | null; type: string }[];
};

export interface Program extends ProgramListItem {
  university_id: string;
  created_at: string;
}

export class ProgramQueryBuilder extends BaseQueryBuilder<ProgramListItem> {
  constructor() {
    super('programs');
  }

  async getList(params: ProgramListParams): Promise<QueryResult<ProgramListItem>> {
    const supabase = this.getSupabase();
    const { page = 1, limit = 12 } = params.pagination || {};
    const offset = (page - 1) * limit;

    let query = supabase
      .from('programs')
      .select(`
        id, name, degree_level, language, category, 
        tuition_fee_per_year, currency, scholarship_coverage, 
        duration_years, is_active,
        universities (id, name_en, name_cn, city, province, logo_url, type)
      `, { count: 'exact' })
      .eq('is_active', params.is_active ?? true)
      .order('name', { ascending: true });

    if (params.university_id) query = query.eq('university_id', params.university_id);
    if (params.search) query = query.ilike('name', `%${params.search}%`);
    if (params.degree_level) query = query.eq('degree_level', params.degree_level);
    if (params.language) query = query.contains('language', [params.language]);
    if (params.category) query = query.eq('category', params.category);
    if (params.scholarship === true) query = query.gt('scholarship_coverage', 0);

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await withTimeout(
      query,
      this.timeout,
      'Programs list query timed out'
    );

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find')) {
        return { data: [], count: 0, error: null };
      }
    }

    return { data: (data || []) as ProgramListItem[], count: count || 0, error };
  }
}

// ============================================================================
// Application Query Builder
// ============================================================================

export interface Application {
  id: string;
  student_id: string;
  program_id: string;
  status: string;
  priority: number;
  created_at: string;
  submitted_at: string | null;
}

/** Application with relations for list */
export type ApplicationListItem = {
  id: string;
  status: string;
  priority: number;
  created_at: string;
  submitted_at: string | null;
  programs?: { id: string; name: string; degree_level: string; universities: { id: string; name_en: string; name_cn: string; logo_url: string | null }[] }[];
};

export class ApplicationQueryBuilder extends BaseQueryBuilder<ApplicationListItem> {
  constructor() {
    super('applications', LONG_TIMEOUT);
  }

  async getByStudentId(studentId: string, status?: string): Promise<QueryResult<ApplicationListItem>> {
    const supabase = this.getSupabase();
    
    let query = supabase
      .from('applications')
      .select(`
        id, status, priority, created_at, submitted_at,
        programs (id, name, degree_level, universities (id, name_en, name_cn, logo_url))
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await withTimeout(
      query,
      this.timeout,
      'Student applications query timed out'
    );

    return { data: (data || []) as ApplicationListItem[], count: data?.length || 0, error };
  }

  async getByIdWithRelations(id: string): Promise<SingleResult<Application>> {
    const supabase = this.getSupabase();
    
    const { data, error } = await withTimeout(
      supabase
        .from('applications')
        .select(`
          *,
          programs (*, universities (*)),
          students (*)
        `)
        .eq('id', id)
        .single(),
      this.timeout,
      'Application detail query timed out'
    );

    return { data: data as Application | null, error };
  }
}

// ============================================================================
// Student Query Builder
// ============================================================================

export interface Student {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  created_at: string;
}

export class StudentQueryBuilder extends BaseQueryBuilder<Student> {
  constructor() {
    super('students');
  }

  async getList(params: {
    pagination?: PaginationParams;
    search?: string | null;
    source?: string | null;
  }): Promise<QueryResult<Student>> {
    const supabase = this.getSupabase();
    const { page = 1, limit = 20 } = params.pagination || {};
    const offset = (page - 1) * limit;

    let query = supabase
      .from('students')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (params.search) {
      const searchTerm = `%${params.search}%`;
      query = query.or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`);
    }

    if (params.source) {
      query = query.eq('source', params.source);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await withTimeout(
      query,
      this.timeout,
      'Students list query timed out'
    );

    return { data: (data || []) as Student[], count: count || 0, error };
  }
}

// ============================================================================
// Blog Query Builder
// ============================================================================

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  status: string;
  published_at: string | null;
  reading_time: number | null;
  view_count: number;
  created_at: string;
}

/** Blog post for list view */
export type BlogPostListItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  reading_time: number | null;
  view_count: number;
  blog_categories?: { id: string; name_en: string; slug: string }[];
};

export class BlogQueryBuilder extends BaseQueryBuilder<BlogPostListItem> {
  constructor() {
    super('blog_posts');
  }

  async getPublished(params?: { limit?: number; category?: string }): Promise<QueryResult<BlogPostListItem>> {
    const supabase = this.getSupabase();
    
    let query = supabase
      .from('blog_posts')
      .select(`
        id, title, slug, excerpt, cover_image_url, 
        published_at, reading_time, view_count,
        blog_categories (id, name_en, slug)
      `, { count: 'exact' })
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (params?.category) {
      query = query.eq('category_slug', params.category);
    }

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    const { data, error, count } = await withTimeout(
      query,
      this.timeout,
      'Blog posts query timed out'
    );

    return { data: (data || []) as BlogPostListItem[], count: count || 0, error };
  }

  async getBySlug(slug: string): Promise<SingleResult<BlogPost>> {
    const supabase = this.getSupabase();
    
    const { data, error } = await withTimeout(
      supabase
        .from('blog_posts')
        .select(`
          *,
          blog_categories (*),
          users:author_id (id, full_name, avatar_url)
        `)
        .eq('slug', slug)
        .eq('status', 'published')
        .single(),
      this.timeout,
      'Blog post detail query timed out'
    );

    return { data: data as BlogPost | null, error };
  }
}

// ============================================================================
// Query Registry
// ============================================================================

/**
 * Registry for all query builders
 * Provides a single point of access to all query builders
 */
export const queries = {
  universities: new UniversityQueryBuilder(),
  programs: new ProgramQueryBuilder(),
  applications: new ApplicationQueryBuilder(),
  students: new StudentQueryBuilder(),
  blog: new BlogQueryBuilder(),
};

// Helper functions for quick access
export const universitiesQueries = queries.universities;
export const programsQueries = queries.programs;
export const applicationsQueries = queries.applications;
export const studentsQueries = queries.students;
export const blogQueries = queries.blog;