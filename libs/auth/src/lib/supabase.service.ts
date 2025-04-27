import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User, AuthResponse } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );

    // Check if user is already logged in
    this.supabase.auth.getSession().then(({ data }) => {
      this.currentUserSubject.next(data.session?.user || null);
    });

    // Listen for auth changes
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.currentUserSubject.next(session?.user || null);
    });
  }

  // Sign up with email and password
  async signUp(email: string, password: string): Promise<AuthResponse> {
    return this.supabase.auth.signUp({
      email,
      password
    });
  }

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<AuthResponse> {
    return this.supabase.auth.signInWithPassword({
      email,
      password
    });
  }

  // Sign in with magic link
  async signInWithMagicLink(email: string): Promise<AuthResponse> {
    return this.supabase.auth.signInWithOtp({
      email
    });
  }

  // Sign in with OAuth provider
  async signInWithProvider(provider: 'google' | 'github' | 'facebook'): Promise<AuthResponse> {
    return this.supabase.auth.signInWithOAuth({
      provider
    });
  }

  // Sign out
  async signOut(): Promise<{ error: Error | null }> {
    return this.supabase.auth.signOut();
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Reset password
  async resetPassword(email: string): Promise<AuthResponse> {
    return this.supabase.auth.resetPasswordForEmail(email);
  }

  // Update password
  async updatePassword(password: string): Promise<AuthResponse> {
    return this.supabase.auth.updateUser({
      password
    });
  }

  // Get Supabase instance
  getSupabase(): SupabaseClient {
    return this.supabase;
  }
}
