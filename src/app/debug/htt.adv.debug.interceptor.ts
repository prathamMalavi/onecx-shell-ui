
// // http-debug.interceptor.ts
// import { HttpInterceptorFn, HttpResponse, HttpErrorResponse } from '@angular/common/http';
// import { tap } from 'rxjs/operators';

// export const httpDebugInterceptor: HttpInterceptorFn = (req, next) => {
//   const start = performance.now();

//   const safeJSON = (val: any) => {
//     try { return JSON.parse(JSON.stringify(val)); }
//     catch { return val; }
//   };

//   return next(req).pipe(
//     tap({
//       next: (event) => {
//         if (event instanceof HttpResponse) {
//           const duration = Math.round(performance.now() - start);

//           const log = {
//             httpDebug: {
//               method: req.method,
//               url: req.urlWithParams,
//               status: event.status,
//               durationMs: duration,
//               request: {
//                 body: safeJSON(req.body),
//                 headers: safeJSON(req.headers),
//               },
//               response: {
//                 body: safeJSON(event.body),
//               }
//             }
//           };

//           console.log(log);
//         }
//       },

//       error: (err: HttpErrorResponse) => {
//         const duration = Math.round(performance.now() - start);

//         const log = {
//           httpDebug: {
//             method: req.method,
//             url: req.urlWithParams,
//             status: err.status,
//             durationMs: duration,
//             errorMessage: err.message,
//             request: {
//               body: safeJSON(req.body)
//             },
//             responseError: safeJSON(err.error)
//           }
//         };

//         console.log(log);
//       }
//     })
//   );
// };



import { HttpInterceptorFn, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { tap } from 'rxjs/operators';

export const httpDebugInterceptor: HttpInterceptorFn = (req, next) => {
  const start = performance.now();

  const safeJSON = (val: any) => {
    try { return JSON.parse(JSON.stringify(val)); } 
    catch { return val; }
  };

  return next(req).pipe(
    tap({
      next: (event) => {
        if (event instanceof HttpResponse) {
          const duration = Math.round(performance.now() - start);

          const data = {
            method: req.method,
            status: event.status,
            statusText: event.statusText,
            durationMs: duration,
            request: {
              body: safeJSON(req.body),
              // add headers if needed
            },
            response: {
              body: safeJSON(event.body),
              // add headers if needed
            }
          };

          // 👉 Print as: <url>, <object>
          console.log("🛜 "  + req.urlWithParams, data);
        }
      },

      error: (err: HttpErrorResponse) => {
        const duration = Math.round(performance.now() - start);

        const data = {
          method: req.method,
          status: err.status,
          statusText: err.statusText,
          durationMs: duration,
          errorMessage: err.message,
          request: {
            body: safeJSON(req.body),
          },
          responseError: safeJSON(err.error),
        };

        // 👉 Print as: <url>, <object>
        console.log("🛜 "+ req.urlWithParams, data);
      }
    })
  );
};
