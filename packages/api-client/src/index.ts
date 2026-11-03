import {
  type AdminRideListQuery,
  type AdminRideListResponse,
  AdminRideListResponseSchema,
  type AvailableRidesResponse,
  AvailableRidesResponseSchema,
  type CancelRideRequest,
  type CreateDriverRequest,
  type CreateDriverResponse,
  CreateDriverResponseSchema,
  type CreateRideRequest,
  type CurrentRideResponse,
  CurrentRideResponseSchema,
  type DriverMeResponse,
  DriverMeResponseSchema,
  type EstimateRequest,
  type EstimateResponse,
  EstimateResponseSchema,
  type LoginRequest,
  type LoginResponse,
  LoginResponseSchema,
  type MeResponse,
  MeResponseSchema,
  type OkResponse,
  OkResponseSchema,
  type PlacesResponse,
  PlacesResponseSchema,
  type Ride,
  RideSchema,
  type UpdateDriverMeRequest,
  type UpdateDriverStatusRequest,
  type UpdateDriverStatusResponse,
  UpdateDriverStatusResponseSchema,
  type UpdatePackageRequest,
  type UpdatePackageResponse,
  UpdatePackageResponseSchema,
} from "@ride/contracts";

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export interface ApiClientOptions {
  /** Base path or origin the client prefixes every request with. Defaults to the same-origin "/api/v1". */
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  /** Supplies a Bearer token for non-cookie clients (mobile, desktop); omit for the web app, which relies on the session cookie. */
  getToken?: () => string | undefined;
}

interface Schema<T> {
  parse(data: unknown): T;
}

interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, string | undefined>;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly getToken?: () => string | undefined;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "/api/v1";
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
    this.getToken = options.getToken;
  }

  private async request<T>(
    method: string,
    path: string,
    schema: Schema<T>,
    options: RequestOptions = {},
  ): Promise<T> {
    const headers: Record<string, string> = { ...options.headers };
    if (options.body !== undefined) headers["content-type"] = "application/json";

    const token = this.getToken?.();
    if (token) headers.authorization = `Bearer ${token}`;

    const query = options.query
      ? Object.entries(options.query).filter(([, value]) => value !== undefined)
      : [];
    const search =
      query.length > 0 ? `?${new URLSearchParams(query as string[][]).toString()}` : "";

    const response = await this.fetchImpl(`${this.baseUrl}${path}${search}`, {
      method,
      credentials: "include",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const json: unknown = await response.json().catch(() => undefined);

    if (!response.ok) {
      const envelope = json as
        | { error?: { code?: string; message?: string; details?: Record<string, unknown> } }
        | undefined;
      throw new ApiClientError(
        response.status,
        envelope?.error?.code ?? "ERROR",
        envelope?.error?.message ?? "Request failed",
        envelope?.error?.details ?? {},
      );
    }

    return schema.parse(json);
  }

  login(body: LoginRequest): Promise<LoginResponse> {
    return this.request("POST", "/auth/login", LoginResponseSchema, { body });
  }

  logout(): Promise<OkResponse> {
    return this.request("POST", "/auth/logout", OkResponseSchema);
  }

  me(): Promise<MeResponse> {
    return this.request("GET", "/auth/me", MeResponseSchema);
  }

  places(q?: string): Promise<PlacesResponse> {
    return this.request("GET", "/places", PlacesResponseSchema, { query: { q } });
  }

  estimate(body: EstimateRequest): Promise<EstimateResponse> {
    return this.request("POST", "/rides/estimate", EstimateResponseSchema, { body });
  }

  createRide(body: CreateRideRequest, idempotencyKey: string): Promise<Ride> {
    return this.request("POST", "/rides", RideSchema, {
      body,
      headers: { "idempotency-key": idempotencyKey },
    });
  }

  getRide(id: string): Promise<Ride> {
    return this.request("GET", `/rides/${id}`, RideSchema);
  }

  cancelRide(id: string, body: CancelRideRequest = {}): Promise<Ride> {
    return this.request("POST", `/rides/${id}/cancel`, RideSchema, { body });
  }

  acceptRide(id: string): Promise<Ride> {
    return this.request("POST", `/rides/${id}/accept`, RideSchema);
  }

  completeRide(id: string): Promise<Ride> {
    return this.request("POST", `/rides/${id}/complete`, RideSchema);
  }

  getDriverMe(): Promise<DriverMeResponse> {
    return this.request("GET", "/driver/me", DriverMeResponseSchema);
  }

  updateDriverMe(body: UpdateDriverMeRequest): Promise<DriverMeResponse> {
    return this.request("PATCH", "/driver/me", DriverMeResponseSchema, { body });
  }

  availableRides(): Promise<AvailableRidesResponse> {
    return this.request("GET", "/driver/rides/available", AvailableRidesResponseSchema);
  }

  currentRide(): Promise<CurrentRideResponse> {
    return this.request("GET", "/driver/rides/current", CurrentRideResponseSchema);
  }

  createDriver(body: CreateDriverRequest): Promise<CreateDriverResponse> {
    return this.request("POST", "/admin/drivers", CreateDriverResponseSchema, { body });
  }

  setDriverActive(
    id: string,
    body: UpdateDriverStatusRequest,
  ): Promise<UpdateDriverStatusResponse> {
    return this.request("PATCH", `/admin/drivers/${id}`, UpdateDriverStatusResponseSchema, {
      body,
    });
  }

  updatePackage(id: string, body: UpdatePackageRequest): Promise<UpdatePackageResponse> {
    return this.request("PATCH", `/admin/packages/${id}`, UpdatePackageResponseSchema, { body });
  }

  adminRides(query: Partial<AdminRideListQuery> = {}): Promise<AdminRideListResponse> {
    return this.request("GET", "/admin/rides", AdminRideListResponseSchema, {
      query: {
        status: query.status,
        limit: query.limit?.toString(),
        offset: query.offset?.toString(),
      },
    });
  }
}
