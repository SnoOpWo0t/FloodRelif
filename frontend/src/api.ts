import type { User, AssistanceRequest, RequestStatus, UrgencyLevel, InventoryItem, DashboardStats, VolunteerTask } from './types';

const API_BASE = '/api';

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function getMe(): Promise<User | null> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    credentials: 'include',
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user;
}

export async function login(email: string, password: string): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to login');
  return data.user;
}

export async function register(name: string, email: string, password: string, role: 'user' | 'admin'): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name, email, password, role }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to register');
  return data.user;
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function fetchStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/requests/stats`, {
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch statistics');
  return data;
}

export async function fetchRequests(status = 'all', urgency = 'all'): Promise<AssistanceRequest[]> {
  const params = new URLSearchParams();
  if (status !== 'all') params.append('status', status);
  if (urgency !== 'all') params.append('urgency', urgency);

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/requests${query}`, {
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load requests');
  return data.requests;
}

export async function submitRequest(payload: {
  title: string;
  description: string;
  location: string;
  urgency: UrgencyLevel;
}): Promise<AssistanceRequest> {
  const res = await fetch(`${API_BASE}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to submit request');
  return data.request;
}

export async function updateRequestStatus(
  id: number,
  payload: {
    status: RequestStatus;
    admin_notes?: string;
    allocated_item_id?: number;
    allocated_quantity?: number;
  }
): Promise<AssistanceRequest> {
  const res = await fetch(`${API_BASE}/requests/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update request');
  return data.request;
}

export async function fetchInventory(): Promise<InventoryItem[]> {
  const res = await fetch(`${API_BASE}/inventory`, {
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch inventory');
  return data.inventory;
}

export async function createInventoryItem(payload: {
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  location: string;
}): Promise<InventoryItem> {
  const res = await fetch(`${API_BASE}/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to add inventory item');
  return data.item;
}

export async function updateInventoryQuantity(id: number, quantity: number): Promise<InventoryItem> {
  const res = await fetch(`${API_BASE}/inventory/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ quantity }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update stock');
  return data.item;
}

export async function deleteInventoryItem(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/inventory/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete item');
}

export async function fetchTasks(status = 'all', myTasks = false): Promise<VolunteerTask[]> {
  const params = new URLSearchParams();
  if (status !== 'all') params.append('status', status);
  if (myTasks) params.append('my_tasks', 'true');

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/tasks${query}`, {
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch volunteer tasks');
  return data.tasks;
}

export async function createVolunteerTask(payload: {
  title: string;
  description?: string;
  location?: string;
  urgency?: UrgencyLevel;
  request_id?: number;
}): Promise<VolunteerTask> {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create task');
  return data.task;
}

export async function claimVolunteerTask(id: number): Promise<VolunteerTask> {
  const res = await fetch(`${API_BASE}/tasks/${id}/claim`, {
    method: 'PATCH',
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to claim task');
  return data.task;
}

export async function completeVolunteerTask(id: number): Promise<VolunteerTask> {
  const res = await fetch(`${API_BASE}/tasks/${id}/complete`, {
    method: 'PATCH',
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to mark task complete');
  return data.task;
}
