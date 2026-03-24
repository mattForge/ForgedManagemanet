/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://hfaouzlfcmjbfxuuktim.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmYW91emxmY21qYmZ4dXVrdGltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDc4NjcsImV4cCI6MjA4OTQ4Mzg2N30.AeJRTIfYYVqTzxx-6Mkp2UXlzDirghXZ9eKCXrxgrXY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
