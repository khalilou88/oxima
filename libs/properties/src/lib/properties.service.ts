import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface Properties {
  [key: string]: any;
}

export class PropertyNotFoundError extends Error {
  constructor(key: string) {
    super(`Property '${key}' not found in configuration`);
    this.name = 'PropertyNotFoundError';
  }
}

/**
 * Simple properties service for accessing configuration from properties.json
 */
@Injectable({
  providedIn: 'root',
})
export class PropertiesService {
  private properties: Properties = {};
  private propertiesLoaded = false;
  private readonly defaultPath = 'assets/properties.json';

  constructor(private readonly http: HttpClient) {}

  /**
   * Load properties from the specified path
   * @param path Optional path to the properties.json file
   * @returns Promise that resolves when properties are loaded
   */
  async loadProperties(path?: string): Promise<Properties> {
    if (this.propertiesLoaded) {
      return this.properties;
    }

    const filePath = path ?? this.defaultPath;

    try {
      // Use firstValueFrom instead of deprecated toPromise()
      this.properties = await firstValueFrom(
        this.http.get<Properties>(filePath)
      );
      this.propertiesLoaded = true;
      return this.properties;
    } catch (error) {
      console.error('Failed to load properties file', error);
      throw new Error('Failed to load properties file');
    }
  }

  /**
   * Get a property value by key
   * @param key The property key (supports dot notation for nested properties)
   * @returns The property value
   * @throws PropertyNotFoundError if the property doesn't exist
   */
  getProperty<T>(key: string): T {
    if (!this.propertiesLoaded) {
      throw new Error('Properties not loaded. Call loadProperties() first');
    }

    const value = this.getNestedProperty(this.properties, key);

    if (value === undefined) {
      throw new PropertyNotFoundError(key);
    }

    return value as T;
  }

  /**
   * Check if a property exists
   * @param key The property key
   * @returns True if the property exists
   */
  hasProperty(key: string): boolean {
    if (!this.propertiesLoaded) {
      throw new Error('Properties not loaded. Call loadProperties() first');
    }

    const value = this.getNestedProperty(this.properties, key);
    return value !== undefined;
  }

  /**
   * Get all properties
   * @returns All properties
   */
  getAllProperties(): Properties {
    if (!this.propertiesLoaded) {
      throw new Error('Properties not loaded. Call loadProperties() first');
    }

    // Return a deep copy to prevent modification
    return JSON.parse(JSON.stringify(this.properties));
  }

  /**
   * Support for nested properties using dot notation
   * @param obj The object to search
   * @param path The property path (e.g. 'app.config.apiUrl')
   * @returns The property value
   */
  private getNestedProperty(obj: any, path: string): any {
    if (!path) return undefined;

    const properties = path.split('.');
    let current = obj;

    for (const prop of properties) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[prop];
    }

    return current;
  }
}
