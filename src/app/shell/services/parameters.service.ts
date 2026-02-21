import { inject, Injectable, OnDestroy } from '@angular/core'
import {
  ApplicationParameters,
  ParametersTopic,
  Parameters,
  RemoteComponent,
  Route
} from '@onecx/integration-interface'
import { AppStateService, RemoteComponentsService } from '@onecx/angular-integration-interface'
import { firstValueFrom } from 'rxjs'
import { GetParametersRequest, GetParametersResponse, Parameter, ParameterBffService } from 'src/app/shared/generated'
import { logOnce } from 'src/app/debug/log.utility'

type Cache = { parameters: (ApplicationParameters & { expirationDate: number })[] }


@Injectable({ providedIn: 'root' })
export class ParametersService implements OnDestroy {
  private readonly appStateService = inject(AppStateService)
  private readonly remoteComponentsService = inject(RemoteComponentsService)
  private readonly parameterBffService = inject(ParameterBffService)
  private readonly cacheItemName = 'onecx-parameters-cache'
  private readonly cacheExpirationTimeMs = 3600 * 1000 // 1 hour
  private readonly parametersTopic = new ParametersTopic()

  private order = 0;


  initialize() {
    //Not awaited on purpose
    this.init()
  }

  ngOnDestroy() {
    this.parametersTopic.destroy()
  }

    private async init() {
        const cache: Cache = this.getCache(this.cacheItemName)
        this.logger('🔑', 'init : ' + this.order, {}, { cache })
        const request: GetParametersRequest = await this.buildGetParametersRequest(
            cache,
            this.appStateService,
            this.remoteComponentsService
        )
        this.logger('🔑', 'init : buildGetParametersRequest ' + this.order, { request }, { cache, appStateService: this.appStateService, remoteComponentsService: this.remoteComponentsService })

    if (Object.keys(request.products).length !== 0) {
      const parameters = await firstValueFrom(this.parameterBffService.getParameters(request))
      this.updateCache(parameters, cache)
      localStorage.setItem(this.cacheItemName, JSON.stringify(cache))
    }
    this.parametersTopic.publish(cache)
  }

    private async buildGetParametersRequest(
        cache: Cache,
        appStateService: AppStateService,
        remoteComponentsService: RemoteComponentsService
    ) {
        const request: GetParametersRequest = { products: {} }
        this.logger('🔑', 'buildGetParametersRequest :  inside ' + this.order, { request }, { cache, appStateService: this.appStateService, remoteComponentsService: this.remoteComponentsService })
        const workspace = await firstValueFrom(appStateService.currentWorkspace$.asObservable())
        this.logger('🔑', 'buildGetParametersRequest :  inside ' + this.order, { workspace }, {})
        this.addToGetParametersRequest(cache, request, workspace.routes ?? [])
        const remoteComponents = await firstValueFrom(remoteComponentsService.remoteComponents$.asObservable())
        this.logger('🔑', 'buildGetParametersRequest :  inside ' + this.order, { remoteComponents }, {})
        this.addToGetParametersRequest(cache, request, remoteComponents.components ?? [])
        return request
    }

    private updateCache(parameters: GetParametersResponse, cache: Cache) {
        this.logger('🔑', 'updateCache :  inside ' + this.order, { parameters }, { cache })
        Object.keys(parameters.products).forEach((productName) => {
            Object.keys(parameters.products[productName]).forEach((appId) => {
                this.updateCacheEntry(cache, parameters, productName, appId)
            })
        })
    }

    private updateCacheEntry(cache: Cache, parameters: GetParametersResponse, productName: string, appId: string) {
        this.logger('🔑', 'updateCacheEntry :  inside ' + this.order, { productName, appId, cache, parameters }, {})
        const params = parameters.products[productName][appId]
        const convertedParams = params.reduce(
            (acc: Parameters, param: Parameter) => ({ ...acc, [param.name]: param.value }),
            {}
        )

        const expirationDate = new Date()
        expirationDate.setSeconds(expirationDate.getSeconds() + this.cacheExpirationTimeMs)
        this.logger('🔑', 'updateCacheEntry :  inside ' + this.order, { expirationDate }, {})


        const existingParameter = cache.parameters.find((item) => item.productName === productName && item.appId === appId)
        if (existingParameter) {
            existingParameter.parameters = convertedParams
            existingParameter.expirationDate = expirationDate.getTime()
        } else {
            cache.parameters.push({
                productName: productName,
                appId: appId,
                expirationDate: expirationDate.getTime(),
                parameters: convertedParams
            })
        }
    }

  private addToGetParametersRequest(cache: Cache, request: GetParametersRequest, items: (Route | RemoteComponent)[]) {
    items.forEach((item) => {
      if (!this.hasValidCache(cache, item.productName ?? '', item.appId ?? '')) {
        request.products[item.productName ?? ''] ??= []
        if (!request.products[item.productName ?? ''].includes(item.appId ?? '')) {
          request.products[item.productName ?? ''].push(item.appId ?? '')
        }
      }
    })
  }

    private getCache(cacheItemName: string): Cache {
        try {
            const cache = JSON.parse(localStorage.getItem(cacheItemName) ?? '{"parameters": []}')
            cache.parameters ??= []
            return cache
        } catch {
            console.error('Failed to parse cache from localStorage')
            return { parameters: [] }
        }
    }

    private hasValidCache(cache: Cache, productName: string, appId: string) {
        const cacheItem = cache.parameters.find((item) => item.productName === productName && item.appId === appId)
        if (cacheItem) {
            const now = new Date()
            const expirationDate = new Date(cacheItem.expirationDate)
            return now < expirationDate
        }
        return false
    }





    // **************************************************************************************************************************************************************
    // **************************************************************************************************************************************************************
    // **************************************************************************************************************************************************************


    public logger(emoji: string, method: string, params: Record<string, unknown>, data: Record<string, unknown>): void {
        this.order++;
        logOnce({
            emoji,
            file: 'parameter.service.ts',
            method,
            params,
            data,
            tag: 'routes',
            level: 'info',
        });

    }


    /**
     * Get a parameter value by name for a given product/app.
     * If not found in cache, returns the provided fallback (string or awaited Promise).
     */
    public async get(
        name: string,
        fallback: string | Promise<string | undefined>,
        productName = 'onecx-shell',
        appId = 'onecx-shell-ui'
    ): Promise<string | undefined> {
        const cache: Cache = this.getCache(this.cacheItemName)
        const entry = cache.parameters.find((item) => item.productName === productName && item.appId === appId)
        const value = entry?.parameters?.[name] as unknown
        if (value !== undefined && value !== null) {
            // Only return string-compatible values here; callers expecting other types should extend as needed
            return (typeof value === 'string' ? value : JSON.stringify(value)) as string
        }
        const fb = typeof fallback === 'string' ? fallback : await fallback
        return fb ?? undefined
    }
}


