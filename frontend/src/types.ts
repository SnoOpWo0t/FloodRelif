export interface User {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  created_at?: string;
}

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';
export type RequestStatus = 'pending' | 'verified' | 'fulfilled' | 'rejected';

export interface AssistanceRequest {
  id: number;
  user_id: number;
  title: string;
  description: string;
  location: string | null;
  urgency: UrgencyLevel;
  status: RequestStatus;
  admin_notes?: string | null;
  allocated_item_id?: number | null;
  allocated_quantity?: number;
  allocated_item_name?: string | null;
  allocated_unit?: string | null;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export interface InventoryItem {
  id: number;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  location: string;
  updated_at: string;
}

export type TaskStatus = 'open' | 'claimed' | 'completed';

export interface VolunteerTask {
  id: number;
  request_id?: number | null;
  title: string;
  description: string | null;
  location: string | null;
  urgency: UrgencyLevel;
  status: TaskStatus;
  assigned_user_id?: number | null;
  volunteer_name?: string | null;
  volunteer_email?: string | null;
  request_title?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface DashboardStats {
  requests: {
    total_requests: number;
    pending_requests: number;
    verified_requests: number;
    fulfilled_requests: number;
    rejected_requests: number;
    critical_unresolved: number;
  };
  inventory: {
    total_items: number;
    low_stock_items: number;
  };
}
