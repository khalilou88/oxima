import { APP_INITIALIZER, EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { PropertiesService } from './properties.service';

export interface PropertiesConfig {
  path?: string;
}

/**
 * Provides the Properties service and configuration
 * @param config Optional configuration options
 * @returns Environment providers for the properties service
 */
export function provideProperties(config?: PropertiesConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideHttpClient(),
    PropertiesService,
    {
      provide: APP_INITIALIZER,
      useFactory: (propertiesService: PropertiesService) => {
        return () => propertiesService.loadProperties(config?.path);
      },
      deps: [PropertiesService],
      multi: true
    }
  ]);
}
