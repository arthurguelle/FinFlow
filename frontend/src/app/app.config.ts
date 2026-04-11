import { ApplicationConfig, ErrorHandler, provideZoneChangeDetection } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { provideAnimations } from "@angular/platform-browser/animations";
import { routes } from "./app.routes";
import { jwtInterceptor, errorInterceptor } from "./core/interceptors/http.interceptor";

class DebugErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    const msg = error instanceof Error ? `${error.message}\n\n${error.stack}` : String(error);
    const pre = document.createElement('pre');
    pre.style.cssText = 'color:red;background:#fff;padding:1rem;font-size:13px;position:fixed;top:0;left:0;right:0;z-index:9999;overflow:auto;max-height:50vh';
    pre.textContent = '[ERRO ANGULAR]\n' + msg;
    document.body.prepend(pre);
    console.error(error);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: ErrorHandler, useClass: DebugErrorHandler },
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([jwtInterceptor, errorInterceptor])),
    provideAnimations(),
  ],
};
