import { createClient } from '@supabase/supabase-js';
import { TennisAnalysisResult } from './tennis-tracker';

// Initialize Supabase client with provided credentials
const supabaseUrl = 'https://qfxlsyjfvdwckbmhuzzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmeGxzeWpmdmR3Y2tibWh1enpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3ODI3NDgsImV4cCI6MjA2NzM1ODc0OH0.LkHO75K9nIcEyz1MSkuK3MMeeYdL-PwLbHK7RJPgCa4';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Auth helper functions
export const auth = {
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// Define the VideoAnalysis type
export interface VideoAnalysis {
  id: string;
  user_id: string;
  video_url: string;
  sport_type: 'tennis' | 'football';
  analysis_status: 'pending' | 'processing' | 'completed' | 'failed';
  analysis_result: TennisAnalysisResult | any;
  created_at: string;
}

// Fetch analysis by ID
export async function getAnalysisById(id: string) {
  return supabase
    .from('video_analysis')
    .select('*')
    .eq('id', id)
    .single();
}

// Create a new analysis record
export async function createAnalysis(data: Omit<VideoAnalysis, 'id' | 'created_at'>, videoUrl: any, sportType: any) {
  return supabase
    .from('video_analysis')
    .insert(data)
    .select()
    .single();
}

// Update an existing analysis record
export async function updateAnalysis(id: string, p0: string, p1: { error: any; }, data: Partial<Omit<VideoAnalysis, 'id' | 'created_at'>>) {
  return supabase
    .from('video_analysis')
    .update(data)
    .eq('id', id);
}

// Fetch analysis by user ID
export async function getAnalysesByUserId(userId: string) {
  return supabase
    .from('video_analysis')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
}

export async function updateAnalysisStatus(
  analysisId: string,
  status: string,
  details?: Record<string, any>
) {
  return supabase
    .from('video_analysis')
    .update({
      analysis_status: status,
      analysis_result: details || null
    })
    .eq('id', analysisId);
}

export type Coordinates = {
  frame_id: number;
  timestamp: number;
  objects: {
    id: string;
    class: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
};
