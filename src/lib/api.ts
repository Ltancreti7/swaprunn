const API_BASE = '/api';

export interface ApiError {
  error: string;
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function camelToSnake(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}

function isPlainObject(obj: any): boolean {
  if (obj === null || obj === undefined) return false;
  if (typeof obj !== 'object') return false;
  if (Array.isArray(obj)) return false;
  if (obj instanceof Date) return false;
  const proto = Object.getPrototypeOf(obj);
  return proto === Object.prototype || proto === null;
}

function transformKeys(obj: any, transformer: (key: string) => string): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => transformKeys(item, transformer));
  }
  if (isPlainObject(obj)) {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[transformer(key)] = transformKeys(obj[key], transformer);
    }
    return result;
  }
  return obj;
}

function toCamelCase<T>(obj: any): T {
  return transformKeys(obj, snakeToCamel);
}

function toSnakeCase(obj: any): any {
  return transformKeys(obj, camelToSnake);
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  const data = await response.json();
  return toCamelCase<T>(data);
}

async function apiRequestWithSnakeBody<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  let body = options.body;
  if (body && typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);
      body = JSON.stringify(toSnakeCase(parsed));
    } catch { /* keep original */ }
  }
  
  return apiRequest<T>(endpoint, { ...options, body });
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiRequest<{ user: { id: string; email: string; role: string } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (email: string, password: string, role: string) =>
      apiRequest<{ user: { id: string; email: string; role: string } }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, role }),
      }),
    registerDealer: (data: { email: string; password: string; name: string; address?: string; phone?: string }) =>
      apiRequest<{ user: { id: string; email: string; role: string }; dealer: any }>('/auth/register-dealer', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    registerSales: (data: { email: string; password: string; name: string; phone?: string; dealerId: string }) =>
      apiRequest<{ user: { id: string; email: string; role: string }; sales: any; status: string }>('/auth/register-sales', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    registerManager: (data: { email: string; password: string; name: string; phone?: string; dealerId: string; role: string }) =>
      apiRequest<{ success: boolean; message: string }>('/auth/register-manager', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    logout: () =>
      apiRequest<{ success: boolean }>('/auth/logout', { method: 'POST' }),
    me: () =>
      apiRequest<{ user: { id: string; email: string; role: string } | null; profile: any }>('/auth/me'),
  },
  dealers: {
    list: () => apiRequest<any[]>('/dealers'),
    get: (id: string) => apiRequest<any>(`/dealers/${id}`),
    current: () => apiRequest<{ dealer: any; adminRole: string }>('/dealer/current'),
    create: (data: any) =>
      apiRequestWithSnakeBody<any>('/dealers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      apiRequestWithSnakeBody<any>(`/dealers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  sales: {
    list: () => apiRequest<any[]>('/sales'),
    get: (id: string) => apiRequest<any>(`/sales/${id}`),
    current: () => apiRequest<any>('/sales/current'),
    byDealer: (dealerId: string) => apiRequest<any[]>(`/sales/dealer/${dealerId}`),
    create: (data: any) =>
      apiRequestWithSnakeBody<any>('/sales', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      apiRequestWithSnakeBody<any>(`/sales/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      apiRequest<{ success: boolean }>(`/sales/${id}`, { method: 'DELETE' }),
    checkPreregistered: (email: string, dealerId: string) =>
      apiRequestWithSnakeBody<{ preRegistered: boolean; salesId?: string }>('/sales/check-preregistered', {
        method: 'POST',
        body: JSON.stringify({ email, dealerId }),
      }),
    activate: (salesId: string) =>
      apiRequestWithSnakeBody<any>('/sales/activate', { method: 'POST', body: JSON.stringify({ salesId }) }),
    approve: (id: string) =>
      apiRequest<any>(`/sales/${id}/approve`, { method: 'POST' }),
    reject: (id: string, reason?: string) =>
      apiRequest<any>(`/sales/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  },
  drivers: {
    list: () => apiRequest<any[]>('/drivers'),
    get: (id: string) => apiRequest<any>(`/drivers/${id}`),
    current: () => apiRequest<any>('/drivers/current'),
    approvedByDealer: (dealerId: string) => apiRequest<any[]>(`/drivers/approved/${dealerId}`),
    myDealerships: () => apiRequest<any[]>('/drivers/my-dealerships'),
    statistics: (dealerId: string) => apiRequest<any[]>(`/driver-statistics/${dealerId}`),
    preferences: (dealerId: string) => apiRequest<any[]>(`/driver-preferences/${dealerId}`),
    upsertPreference: (data: { driverId: string; dealerId: string; preferenceLevel: number }) =>
      apiRequestWithSnakeBody<any>('/driver-preferences', { method: 'POST', body: JSON.stringify(data) }),
    create: (data: any) =>
      apiRequestWithSnakeBody<any>('/drivers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      apiRequestWithSnakeBody<any>(`/drivers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      apiRequest<{ success: boolean }>(`/drivers/${id}`, { method: 'DELETE' }),
    checkAvailability: (driverId: string, date: string) => 
      apiRequest<{ driverId: string; date: string; isAvailable: boolean; scheduledDeliveries: { id: string; scheduledTime: string | null; status: string; dropoff: string }[] }>(`/drivers/${driverId}/availability?date=${date}`),
  },
  deliveries: {
    list: () => apiRequest<any[]>('/deliveries'),
    get: (id: string) => apiRequest<any>(`/deliveries/${id}`),
    getWithRelations: (id: string) => apiRequest<any>(`/deliveries/${id}/with-relations`),
    byDealer: (dealerId: string) => apiRequest<any[]>(`/deliveries/dealer/${dealerId}`),
    bySales: (salesId: string) => apiRequest<any[]>(`/deliveries/sales/${salesId}`),
    byDriver: (driverId: string, status?: string) => 
      apiRequest<any[]>(`/deliveries/driver/${driverId}${status ? `?status=${status}` : ''}`),
    requestsForDriver: (driverId: string) => apiRequest<any[]>(`/deliveries/driver/${driverId}/requests`),
    create: (data: any) =>
      apiRequestWithSnakeBody<any>('/deliveries', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      apiRequestWithSnakeBody<any>(`/deliveries/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    accept: (id: string, driverId: string) =>
      apiRequestWithSnakeBody<any>(`/deliveries/${id}/accept`, { method: 'POST', body: JSON.stringify({ driverId }) }),
    decline: (id: string, driverId: string) =>
      apiRequestWithSnakeBody<any>(`/deliveries/${id}/decline`, { method: 'POST', body: JSON.stringify({ driverId }) }),
    scheduled: (year: number, month: number) =>
      apiRequest<any[]>(`/deliveries/scheduled?year=${year}&month=${month}`),
  },
  messages: {
    list: (deliveryId: string) => apiRequest<any[]>(`/messages/${deliveryId}`),
    create: (data: any) =>
      apiRequestWithSnakeBody<any>('/messages', { method: 'POST', body: JSON.stringify(data) }),
    markRead: (deliveryId: string) =>
      apiRequest<{ success: boolean }>(`/messages/${deliveryId}/read`, { method: 'POST' }),
    unreadCount: () => apiRequest<{ count: number }>('/messages/unread/count'),
  },
  conversations: {
    list: () => apiRequest<any[]>('/conversations'),
  },
  notifications: {
    list: () => apiRequest<any[]>('/notifications'),
    create: (data: any) =>
      apiRequestWithSnakeBody<any>('/notifications', { method: 'POST', body: JSON.stringify(data) }),
    markRead: (id: string) =>
      apiRequest<{ success: boolean }>(`/notifications/${id}/read`, { method: 'POST' }),
  },
  driverApplications: {
    list: () => apiRequest<any[]>('/driver-applications'),
    byDealer: (dealerId: string) => apiRequest<any[]>(`/driver-applications/dealer/${dealerId}`),
    create: (data: any) =>
      apiRequestWithSnakeBody<any>('/driver-applications', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      apiRequestWithSnakeBody<any>(`/driver-applications/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  approvedDriverDealers: {
    list: () => apiRequest<any[]>('/approved-driver-dealers'),
    byDriver: (driverId: string) => apiRequest<any[]>(`/approved-driver-dealers/driver/${driverId}`),
    create: (data: any) =>
      apiRequestWithSnakeBody<any>('/approved-driver-dealers', { method: 'POST', body: JSON.stringify(data) }),
    delete: (driverId: string, dealerId: string) =>
      apiRequest<{ success: boolean }>(`/approved-driver-dealers/${driverId}/${dealerId}`, { method: 'DELETE' }),
    updateVerification: (driverId: string, dealerId: string, isVerified: boolean, notes?: string) =>
      apiRequest<any>(`/approved-driver-dealers/${driverId}/${dealerId}/verification`, {
        method: 'PATCH',
        body: JSON.stringify({ isVerified, notes }),
      }),
  },
  dealerAdmins: {
    list: () => apiRequest<any[]>('/dealer-admins'),
    byDealer: (dealerId: string) => apiRequest<any[]>(`/dealer-admins/with-emails/${dealerId}`),
    pendingByDealer: (dealerId: string) => apiRequest<any[]>(`/dealer-admins/pending/${dealerId}`),
    create: (data: any) =>
      apiRequestWithSnakeBody<any>('/dealer-admins', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      apiRequestWithSnakeBody<any>(`/dealer-admins/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      apiRequest<{ success: boolean }>(`/dealer-admins/${id}`, { method: 'DELETE' }),
    roleForCurrentUser: (dealerId: string) => 
      apiRequest<any>(`/dealer-admins/role/${dealerId}`),
    approve: (id: string) =>
      apiRequest<{ success: boolean }>(`/dealer-admins/${id}/approve`, { method: 'POST' }),
    reject: (id: string) =>
      apiRequest<{ success: boolean }>(`/dealer-admins/${id}/reject`, { method: 'POST' }),
  },
  user: {
    adminRoles: () => apiRequest<any[]>('/user/admin-roles'),
    updateProfile: (data: any) =>
      apiRequestWithSnakeBody<any>('/user/profile', { method: 'PATCH', body: JSON.stringify(data) }),
    changePassword: (password: string) =>
      apiRequest<{ success: boolean }>('/user/password', { method: 'PATCH', body: JSON.stringify({ password }) }),
    deleteAccount: () =>
      apiRequest<{ message: string }>('/user/account', { method: 'DELETE' }),
  },
  adminInvitations: {
    pending: () => apiRequest<any[]>('/admin-invitations/pending'),
    byDealer: (dealerId: string) => apiRequest<any[]>(`/admin-invitations/dealer/${dealerId}`),
    create: (data: any) =>
      apiRequestWithSnakeBody<any>('/admin-invitations', { method: 'POST', body: JSON.stringify(data) }),
    accept: (token: string) =>
      apiRequest<{ success: boolean }>(`/admin-invitations/${token}/accept`, { method: 'POST' }),
    cancel: (id: string) =>
      apiRequest<{ success: boolean }>(`/admin-invitations/${id}`, { method: 'DELETE' }),
  },
  search: {
    deliveries: (params: { q?: string; status?: string; dealerId?: string; driverId?: string; dateFrom?: string; dateTo?: string }) => {
      const queryParams = new URLSearchParams();
      if (params.q) queryParams.set('q', params.q);
      if (params.status) queryParams.set('status', params.status);
      if (params.dealerId) queryParams.set('dealerId', params.dealerId);
      if (params.driverId) queryParams.set('driverId', params.driverId);
      if (params.dateFrom) queryParams.set('dateFrom', params.dateFrom);
      if (params.dateTo) queryParams.set('dateTo', params.dateTo);
      return apiRequest<any[]>(`/search/deliveries?${queryParams.toString()}`);
    },
  },
  export: {
    deliveriesCsv: (dealerId: string, params?: { status?: string; dateFrom?: string; dateTo?: string }) => {
      const queryParams = new URLSearchParams({ dealerId });
      if (params?.status) queryParams.set('status', params.status);
      if (params?.dateFrom) queryParams.set('dateFrom', params.dateFrom);
      if (params?.dateTo) queryParams.set('dateTo', params.dateTo);
      return `/api/deliveries/export/csv?${queryParams.toString()}`;
    },
  },
  onboarding: {
    getProgress: () => apiRequest<{ progress: { completedSteps: string[]; dismissed: boolean } | null }>('/onboarding/progress'),
    updateProgress: (data: { completedSteps?: string[]; dismissed?: boolean }) =>
      apiRequestWithSnakeBody<{ success: boolean }>('/onboarding/progress', { method: 'PATCH', body: JSON.stringify(data) }),
  },
  pushTokens: {
    register: (token: string, platform: string) =>
      apiRequest<{ success: boolean }>('/push-tokens', { method: 'POST', body: JSON.stringify({ token, platform }) }),
    unregister: (token: string) =>
      apiRequest<{ success: boolean }>('/push-tokens', { method: 'DELETE', body: JSON.stringify({ token }) }),
  },
};

export default api;
