import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => {
    document.body.innerHTML = `<pre style="color:red;padding:2rem;font-size:14px">[ERRO BOOTSTRAP]\n${err?.message ?? err}\n\n${err?.stack ?? ''}</pre>`;
    console.error(err);
  });
