import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      'environment.supabaseUrl',
      'environment.supabaseKey'
    );
  }

  get auth() {
    return this.supabase.auth;
  }

  get storage() {
    return this.supabase.storage;
  }

  // Helper method to get data
  async getData(table: string) {
    const { data, error } = await this.supabase
      .from(table)
      .select('*');

    if (error) throw error;
    return data;
  }

  // Helper method to insert data
  async insertData(table: string, data: any) {
    const { error } = await this.supabase
      .from(table)
      .insert(data);

    if (error) throw error;
    return true;
  }
}
