import { Injectable, signal, computed, effect, Signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface Properties {
  [key: string]: any;
}

/**
 * Modern properties service using Angular signals for reactive configuration management
 */
@Injectable({
  providedIn: 'root'
})
export class PropertiesService {
  // Signal to hold the properties
  private propertiesSignal = signal<Properties>({});

  // Read-only signal for public consumption
  public readonly properties: Signal<Properties> = computed(() => this.propertiesSignal());

  private propertiesLoaded = false;
  private defaultPath = 'assets/properties.json';

  constructor(private http: HttpClient) {}

  /**
   * Load properties from the specified path
   * @param path Optional path to the properties.json file
   * @returns Promise that resolves when properties are loaded
   */
  async loadProperties(path?: string): Promise<Properties> {
    if (this.propertiesLoaded) {
      return this.propertiesSignal();
    }

    const filePath = path || this.defaultPath;

    try {
      const properties = await firstValueFrom(
        this.http.get<Properties>(filePath).pipe(
          catchError(error => {
            console.error('Failed to load properties file', error);
            return Promise.resolve({} as Properties);
          })
        )
      );

      this.propertiesSignal.set(properties);
      this.propertiesLoaded = true;
      return properties;
    } catch (error) {
      console.error('Error loading properties:', error);
      return {};
    }
  }

  /**
   * Get a property value by key
   * @param key The property key (supports dot notation for nested properties)
   * @param defaultValue Default value if property doesn't exist
   * @returns The property value or default value
   */
  getProperty<T>(key: string, defaultValue?: T): T {
    const properties = this.propertiesSignal();
    const value = this.getNestedProperty(properties, key);
    return (value !== undefined) ? value as T : (defaultValue as T);
  }

  /**
   * Create a signal that contains a specific property value and updates when the property changes
   * @param key The property key
   * @param defaultValue Default value if property doesn't exist
   * @returns A signal containing the property value
   */
  propertySignal<T>(key: string, defaultValue?: T): Signal<T> {
    return computed(() => {
      const properties = this.propertiesSignal();
      const value = this.getNestedProperty(properties, key);
      return (value !== undefined) ? value as T : (defaultValue as T);
    });
  }

  /**
   * Update a specific property
   * @param key The property key
   * @param value The new value
   */
  setProperty<T>(key: string, value: T): void {
    const properties = {...this.propertiesSignal()};
    this.setNestedProperty(properties, key, value);
    this.propertiesSignal.set(properties);
  }

  /**
   * Update multiple properties at once
   * @param newProperties The properties to update
   */
  updateProperties(newProperties: Partial<Properties>): void {
    this.propertiesSignal.update(currentProps => ({
      ...currentProps,
      ...newProperties
    }));
  }

  /**
   * Get all properties
   * @returns All properties
   */
  getAllProperties(): Properties {
    return {...this.propertiesSignal()};
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

  /**
   * Set a nested property using dot notation
   * @param obj The object to modify
   * @param path The property path (e.g. 'app.config.apiUrl')
   * @param value The value to set
   */
  private setNestedProperty(obj: any, path: string, value: any): void {
    if (!path) return;

    const properties = path.split('.');
    const lastProp = properties.pop()!;
    let current = obj;

    for (const prop of properties) {
      if (current[prop] === undefined) {
        current[prop] = {};
      } else if (typeof current[prop] !== 'object') {
        current[prop] = {};
      }
      current = current[prop];
    }

    current[lastProp] = value;
  }
}
