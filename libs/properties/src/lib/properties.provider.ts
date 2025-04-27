import {
  EnvironmentProviders,
  makeEnvironmentProviders,
  inject,
  provideAppInitializer,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { PropertiesService } from './properties.service';

export interface PropertiesConfig {
  path?: string;
}

/**
 * Provides the Properties service and configuration using provideAppInitializer
 * @param config Optional configuration options
 * @returns Environment providers for the properties service
 */
export function provideProperties(
  config?: PropertiesConfig
): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideHttpClient(),
    PropertiesService,
    // Fix: directly return the Promise from loadProperties
    provideAppInitializer(() => {
      const propertiesService = inject(PropertiesService);
      return propertiesService.loadProperties(config?.path);
    }),
  ]);
}
