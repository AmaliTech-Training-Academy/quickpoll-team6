export interface Department {
  id: number;
  name: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  departments: Department[];
  createdAt?: string | null;
  created_at?: string | null;
}

export interface AuthResponse {
  token: string;
  email: string;
  name: string;
  role: string;
}

export interface DepartmentMember {
  id: number;
  email: string;
  department_id: number;
}

export interface Poll {
  id: number;
  question: string;
  description: string;
  creatorEmail: string;
  creatorName: string;
  maxSelections: number;
  anonymous: boolean;
  departmentIds: number[];
  expiresAt: string;
  createdAt: string;
  status: string;
  options: PollOption[];
}

export interface PollOption {
  id: number;
  poll_id: number;
  text: string;
  vote_count: number | null;
}

export interface PollInvite {
  id: number;
  poll_id: number;
  department_member_id: number;
  invited_at: string | null;
  vote_status: string | null;
}

export interface Vote {
  id: number;
  poll_id: number;
  option_id: number;
  user_id: number;
  created_at: string | null;
}

export interface PollResultOption {
  optionId: number;
  optionText: string;
  voteCount: number;
  votePercentage: number;
}

export interface PollResult {
  id: number;
  title: string;
  question: string;
  description: string;
  creatorName: string;
  status: string;
  maxSelections: number;
  expiresAt: string;
  createdAt: string;
  totalVotes: number;
  options: PollResultOption[];
  uniqueVoters: number;
  participationRate: number;
}

export interface ClosePollOption {
  id: number;
  text: string;
  voteCount: number;
  percentage: number;
}

export interface ClosePollResponse {
  id: number;
  question: string;
  description: string;
  creatorEmail: string;
  creatorName: string;
  status: string;
  maxSelections: number;
  expiresAt: string;
  createdAt: string;
  totalVotes: number;
  invitedDepartments: string[];
  options: ClosePollOption[];
}

export interface PollAnalyticsOption {
  optionId: number;
  optionText: string;
  voteCount: number;
  votePercentage: number;
}

export interface PollAnalyticsResult {
  pollId: number;
  title: string;
  description: string | null;
  creatorId: number;
  creatorName: string;
  status: 'ACTIVE' | 'CLOSED';
  maxSelections: number;
  createdAt: string | null;
  expiresAt: string | null;
  totalVotes: number;
  uniqueVoters: number;
  participationRate: number;
  lastUpdated: string | null;
  options: PollAnalyticsOption[];
}

export interface TimeseriesPoint {
  bucketTime: string;
  votesInBucket: number;
}

export interface PollTimeseriesResponse {
  pollId: number;
  points: TimeseriesPoint[];
}
