-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (managed by Supabase Auth)
-- We'll use auth.users and create profiles

-- Academies table
CREATE TABLE IF NOT EXISTS academies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_status VARCHAR(20) DEFAULT 'trial' CHECK (subscription_status IN ('active', 'inactive', 'trial')),
  subscription_end_date DATE,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Coaches table
CREATE TABLE IF NOT EXISTS coaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  academy_id UUID REFERENCES academies(id) ON DELETE SET NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  specialization TEXT[], -- Array of specializations
  experience_years INTEGER DEFAULT 0,
  certification TEXT[], -- Array of certifications
  hourly_rate DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parents table
CREATE TABLE IF NOT EXISTS parents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  relationship VARCHAR(20) CHECK (relationship IN ('father', 'mother', 'guardian')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Can be null for players without accounts
  academy_id UUID REFERENCES academies(id) ON DELETE SET NULL, -- Can be null for independent players
  coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES parents(id) ON DELETE SET NULL,
  
  -- Basic Info
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  serial_number VARCHAR(50) UNIQUE NOT NULL, -- Auto-generated unique ID
  
  -- Contact Info
  personal_phone VARCHAR(20),
  father_phone VARCHAR(20),
  mother_phone VARCHAR(20),
  whatsapp_number VARCHAR(20),
  
  -- Technical Info
  dominant_hand VARCHAR(10) CHECK (dominant_hand IN ('right', 'left')),
  dominant_eye VARCHAR(10) CHECK (dominant_eye IN ('right', 'left')),
  backhand_type VARCHAR(20) CHECK (backhand_type IN ('one_handed', 'two_handed')),
  
  -- Payment Status
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('paid', 'overdue', 'pending')),
  payment_due_date DATE,
  monthly_fee DECIMAL(10,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Training Groups table
CREATE TABLE IF NOT EXISTS training_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  schedule JSONB, -- Store schedule as JSON: [{"day": "monday", "start_time": "18:00", "end_time": "20:00", "type": "tennis"}]
  max_players INTEGER DEFAULT 8,
  age_group VARCHAR(50),
  skill_level VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player Groups (Many-to-Many relationship)
CREATE TABLE IF NOT EXISTS player_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  group_id UUID REFERENCES training_groups(id) ON DELETE CASCADE,
  joined_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(player_id, group_id)
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  group_id UUID REFERENCES training_groups(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) CHECK (status IN ('present', 'absent', 'excused')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, group_id, date)
);

-- Group Sessions table (for group training plans and evaluations)
CREATE TABLE IF NOT EXISTS group_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES training_groups(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  plan TEXT, -- Training plan for the session
  objectives TEXT[], -- Array of objectives
  general_feedback TEXT, -- General feedback about the group's performance
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player Group Evaluations (individual player evaluation in group sessions)
CREATE TABLE IF NOT EXISTS player_group_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES group_sessions(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  notes TEXT,
  improvements TEXT[], -- Array of improvements noted
  areas_to_work TEXT[], -- Array of areas that need work
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, player_id)
);

-- Private Sessions table
CREATE TABLE IF NOT EXISTS private_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  session_notes TEXT,
  identified_weaknesses TEXT[], -- Array of weaknesses identified
  achieved_improvements TEXT[], -- Array of improvements achieved
  improvement_percentage INTEGER CHECK (improvement_percentage >= 0 AND improvement_percentage <= 100),
  next_session_focus TEXT[], -- Array of focus points for next session
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 10),
  session_cost DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  age_category VARCHAR(50), -- e.g., "Under 12", "Under 14", "Under 16"
  start_date DATE,
  end_date DATE,
  location VARCHAR(255),
  registration_deadline DATE,
  entry_fee DECIMAL(10,2),
  max_participants INTEGER,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournament Registrations
CREATE TABLE IF NOT EXISTS tournament_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  registration_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'cancelled')),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tournament_id, player_id)
);

-- User Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'academy_admin', 'coach', 'player', 'parent')),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_players_academy_id ON players(academy_id);
CREATE INDEX IF NOT EXISTS idx_players_coach_id ON players(coach_id);
CREATE INDEX IF NOT EXISTS idx_players_parent_id ON players(parent_id);
CREATE INDEX IF NOT EXISTS idx_attendance_player_date ON attendance(player_id, date);
CREATE INDEX IF NOT EXISTS idx_private_sessions_player_date ON private_sessions(player_id, date);
CREATE INDEX IF NOT EXISTS idx_coaches_academy_id ON coaches(academy_id);
CREATE INDEX IF NOT EXISTS idx_training_groups_academy_id ON training_groups(academy_id);

-- Enable Row Level Security (RLS)
ALTER TABLE academies ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_group_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User Profiles: Users can only see and edit their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Academies: Academy admins can manage their academy
CREATE POLICY "Academy admins can manage their academy" ON academies
  FOR ALL USING (auth.uid() = admin_id);

-- Players: Complex access based on role
CREATE POLICY "Players can view own profile" ON players
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Academy admins can manage academy players" ON players
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM academies 
      WHERE academies.id = players.academy_id 
      AND academies.admin_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view their players" ON players
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coaches 
      WHERE coaches.id = players.coach_id 
      AND coaches.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view their children" ON players
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parents 
      WHERE parents.id = players.parent_id 
      AND parents.user_id = auth.uid()
    )
  );

-- Coaches: Academy admins can manage coaches in their academy
CREATE POLICY "Academy admins can manage coaches" ON coaches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM academies 
      WHERE academies.id = coaches.academy_id 
      AND academies.admin_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view own profile" ON coaches
  FOR SELECT USING (auth.uid() = user_id);

-- Private Sessions: Coaches can manage sessions for their players
CREATE POLICY "Coaches can manage private sessions" ON private_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM coaches 
      WHERE coaches.id = private_sessions.coach_id 
      AND coaches.user_id = auth.uid()
    )
  );

CREATE POLICY "Players can view their private sessions" ON private_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players 
      WHERE players.id = private_sessions.player_id 
      AND players.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view their children's private sessions" ON private_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players 
      JOIN parents ON parents.id = players.parent_id
      WHERE players.id = private_sessions.player_id 
      AND parents.user_id = auth.uid()
    )
  );

-- Attendance: Similar policies for attendance
CREATE POLICY "Coaches can manage attendance" ON attendance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM training_groups 
      JOIN coaches ON coaches.id = training_groups.coach_id
      WHERE training_groups.id = attendance.group_id 
      AND coaches.user_id = auth.uid()
    )
  );

CREATE POLICY "Players can view their attendance" ON attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players 
      WHERE players.id = attendance.player_id 
      AND players.user_id = auth.uid()
    )
  );

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'player'),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to relevant tables
CREATE TRIGGER update_academies_updated_at BEFORE UPDATE ON academies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coaches_updated_at BEFORE UPDATE ON coaches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();