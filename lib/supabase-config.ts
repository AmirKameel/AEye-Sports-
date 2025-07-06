import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://qfxlsyjfvdwckbmhuzzb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmeGxzeWpmdmR3Y2tibWh1enpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3ODI3NDgsImV4cCI6MjA2NzM1ODc0OH0.LkHO75K9nIcEyz1MSkuK3MMeeYdL-PwLbHK7RJPgCa4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface User {
  id: string;
  email: string;
  role: 'super_admin' | 'academy_admin' | 'coach' | 'player' | 'parent';
  created_at: string;
  updated_at: string;
}

export interface Academy {
  id: string;
  name: string;
  admin_id: string;
  subscription_status: 'active' | 'inactive' | 'trial';
  subscription_end_date: string;
  created_at: string;
  updated_at: string;
}

export interface Coach {
  id: string;
  user_id: string;
  academy_id: string | null;
  first_name: string;
  last_name: string;
  phone: string;
  specialization: string[];
  experience_years: number;
  certification: string[];
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  user_id: string | null; // null for players without accounts
  academy_id: string | null; // null for independent players
  coach_id: string | null;
  parent_id: string | null;
  
  // Basic Info
  first_name: string;
  last_name: string;
  date_of_birth: string;
  serial_number: string; // Auto-generated unique ID
  
  // Contact Info
  personal_phone: string | null;
  father_phone: string | null;
  mother_phone: string | null;
  whatsapp_number: string | null;
  
  // Technical Info
  dominant_hand: 'right' | 'left';
  dominant_eye: 'right' | 'left';
  backhand_type: 'one_handed' | 'two_handed';
  
  // Payment Status
  payment_status: 'paid' | 'overdue' | 'pending';
  payment_due_date: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface Parent {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  relationship: 'father' | 'mother' | 'guardian';
  created_at: string;
  updated_at: string;
}

export interface TrainingGroup {
  id: string;
  academy_id: string;
  coach_id: string;
  name: string;
  description: string;
  schedule: {
    day: string;
    start_time: string;
    end_time: string;
    type: 'tennis' | 'fitness';
  }[];
  max_players: number;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  player_id: string;
  group_id: string;
  date: string;
  status: 'present' | 'absent' | 'excused';
  notes: string | null;
  created_at: string;
}

export interface GroupSession {
  id: string;
  group_id: string;
  coach_id: string;
  date: string;
  title: string;
  description: string;
  plan: string;
  objectives: string[];
  general_feedback: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlayerGroupEvaluation {
  id: string;
  session_id: string;
  player_id: string;
  rating: number; // 1-10
  notes: string;
  improvements: string[];
  areas_to_work: string[];
  created_at: string;
}

export interface PrivateSession {
  id: string;
  player_id: string;
  coach_id: string;
  date: string;
  duration_minutes: number;
  session_notes: string;
  identified_weaknesses: string[];
  achieved_improvements: string[];
  improvement_percentage: number;
  next_session_focus: string[];
  overall_rating: number; // 1-10
  created_at: string;
  updated_at: string;
}

export interface Tournament {
  id: string;
  name: string;
  age_category: string;
  start_date: string;
  end_date: string;
  location: string;
  registration_deadline: string;
  is_active: boolean;
  created_at: string;
}

// Authentication functions
export const signUp = async (email: string, password: string, role: string, additionalData: any) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        ...additionalData
      }
    }
  });
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

// Database helper functions
export const createPlayer = async (playerData: Omit<Player, 'id' | 'created_at' | 'updated_at' | 'serial_number'>) => {
  // Generate unique serial number
  const serialNumber = `P${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  
  const { data, error } = await supabase
    .from('players')
    .insert({
      ...playerData,
      serial_number: serialNumber
    })
    .select()
    .single();
  
  return { data, error };
};

export const getPlayerProfile = async (playerId: string) => {
  const { data, error } = await supabase
    .from('players')
    .select(`
      *,
      academy:academies(*),
      coach:coaches(*),
      parent:parents(*),
      training_groups:player_groups(
        group:training_groups(*)
      )
    `)
    .eq('id', playerId)
    .single();
  
  return { data, error };
};

export const getPlayerAttendance = async (playerId: string, startDate?: string, endDate?: string) => {
  let query = supabase
    .from('attendance')
    .select('*')
    .eq('player_id', playerId);
  
  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);
  
  const { data, error } = await query.order('date', { ascending: false });
  return { data, error };
};

export const getPlayerPrivateSessions = async (playerId: string) => {
  const { data, error } = await supabase
    .from('private_sessions')
    .select(`
      *,
      coach:coaches(first_name, last_name)
    `)
    .eq('player_id', playerId)
    .order('date', { ascending: false });
  
  return { data, error };
};

export const getEligibleTournaments = async (dateOfBirth: string) => {
  const age = new Date().getFullYear() - new Date(dateOfBirth).getFullYear();
  
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('is_active', true)
    .or(`age_category.ilike.%under ${age + 1}%,age_category.ilike.%under ${age + 2}%`)
    .gte('registration_deadline', new Date().toISOString().split('T')[0]);
  
  return { data, error };
};

// Academy management functions
export const createAcademy = async (academyData: Omit<Academy, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('academies')
    .insert(academyData)
    .select()
    .single();
  
  return { data, error };
};

export const getAcademyPlayers = async (academyId: string) => {
  const { data, error } = await supabase
    .from('players')
    .select(`
      *,
      coach:coaches(first_name, last_name),
      parent:parents(first_name, last_name, phone)
    `)
    .eq('academy_id', academyId);
  
  return { data, error };
};

export const getAcademyCoaches = async (academyId: string) => {
  const { data, error } = await supabase
    .from('coaches')
    .select('*')
    .eq('academy_id', academyId);
  
  return { data, error };
};

// Coach functions
export const getCoachPlayers = async (coachId: string) => {
  const { data, error } = await supabase
    .from('players')
    .select(`
      *,
      academy:academies(name),
      parent:parents(first_name, last_name, phone)
    `)
    .eq('coach_id', coachId);
  
  return { data, error };
};

export const createPrivateSession = async (sessionData: Omit<PrivateSession, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('private_sessions')
    .insert(sessionData)
    .select()
    .single();
  
  return { data, error };
};

export const recordAttendance = async (attendanceData: Omit<Attendance, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('attendance')
    .upsert(attendanceData, {
      onConflict: 'player_id,group_id,date'
    })
    .select()
    .single();
  
  return { data, error };
};