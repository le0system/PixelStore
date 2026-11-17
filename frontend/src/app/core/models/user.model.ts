export interface User { id: number; name: string; email: string; role: 'admin' | 'cliente'; }
export interface AuthPayload { token: string; user: User; }
