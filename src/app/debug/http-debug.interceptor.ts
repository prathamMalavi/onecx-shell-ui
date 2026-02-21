import { HttpInterceptorFn } from '@angular/common/http'
import { inject } from '@angular/core'
import { AppStateService } from '@onecx/angular-integration-interface'

export const httpDebugInterceptor: HttpInterceptorFn = (req, next) => {
  const appState = inject(AppStateService)
  const initReady = !!(appState as any)?.isAuthenticated$?.isInitialized
  // Minimal debug log to trace request timing vs auth init
  console.log('[http-debug] req', req.url, { initReady })
  return next(req)
}
