export interface Gig {
  id: string;
  service_name: string;
  description: string;
  price: number;
  delivery_time: string;
  created_at: string;
  status: 'active' | 'paused';
  tags?: string[];
  avg_rating?: number;
  review_count?: number;
}

export interface HiredGig {
  id: string;
  gig_id: string;
  service_name: string;
  description: string;
  price: number;
  delivery_time: string;
  client_name: string;
  hired_at: string;
  renewal_status: 'none' | 'pending' | 'accepted' | 'rejected';
}

export interface ContractRequest {
  id: string;
  gig_id: string;
  hired_gig_id?: string;
  service_name: string;
  price: number;
  client_name: string;
  type: 'initial' | 'renewal';
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

export interface UserProfile {
  name: string;
  bio: string;
  total_earned: number;
  profile_image?: string;
  theme?: 'dark' | 'light';
}

export interface Review {
  id: string;
  gig_id: string;
  rating: number;
  comment: string;
  client_name: string;
  created_at: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: number;
  metadata: string;
  created_at: string;
}

export interface AnalyticsSummary {
  totalEarned: number;
  totalGigs: number;
  activeGigs: number;
  totalContracts: number;
  avgRating: number | null;
  totalReviews: number;
}

export interface Analytics {
  summary: AnalyticsSummary;
  monthlyEarnings: { month: string; earnings: number; contracts: number }[];
  topGigs: { service_name: string; price: number; hires: number; revenue: number; avg_rating: number | null }[];
  ratingDist: { rating: number; count: number }[];
  contractBreakdown: { renewal_status: string; count: number }[];
}
