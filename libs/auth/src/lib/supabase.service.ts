import { inject, Injectable } from '@angular/core';
import {
  AuthError,
  AuthResponse,
  createClient,
  OAuthResponse,
  SupabaseClient,
  User,
  UserResponse,
} from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';

import { PropertiesService } from '@oxima/properties';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private readonly supabase: SupabaseClient;
  private readonly currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private readonly propertiesService = inject(PropertiesService);
  private readonly supabaseUrl =
    this.propertiesService.getProperty<string>('supabaseUrl');
  private readonly supabaseKey =
    this.propertiesService.getProperty<string>('supabaseKey');

  constructor() {
    this.supabase = createClient(this.supabaseUrl, this.supabaseKey);

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
      password,
    });
  }

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<AuthResponse> {
    return this.supabase.auth.signInWithPassword({
      email,
      password,
    });
  }

  // Sign in with magic link
  async signInWithMagicLink(email: string): Promise<AuthResponse> {
    return this.supabase.auth.signInWithOtp({
      email,
    });
  }

  // Sign in with OAuth provider
  async signInWithProvider(
    provider: 'google' | 'github' | 'facebook'
  ): Promise<OAuthResponse> {
    return this.supabase.auth.signInWithOAuth({
      provider,
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
  async resetPassword(email: string): Promise<
    | {
        data: {};
        error: null;
      }
    | {
        data: null;
        error: AuthError;
      }
  > {
    return this.supabase.auth.resetPasswordForEmail(email);
  }

  // Update password
  async updatePassword(password: string): Promise<UserResponse> {
    return this.supabase.auth.updateUser({
      password,
    });
  }

  // Get Supabase instance
  getSupabase(): SupabaseClient {
    return this.supabase;
  }
}
