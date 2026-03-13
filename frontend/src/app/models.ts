export interface Department {
  id: number;
  name: string;
}

export interface DepartmentResponse {
  id: number;
  name: string;
  emails: string[];
  failedEmails: string[];
}

export interface DepartmentRequest {
  name: string;
  emails: string[];
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
  hasVoted?: boolean;
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

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface DashboardSummary {
  activePollCount: number;
  closedPollCount: number;
  totalPollCount: number;
  totalVotesCast: number;
  averageParticipationRate: number;
  lastRefreshedAt: string | null;
}

export interface ActivePollItem {
  pollId: number;
  title: string;
  creatorId: number;
  creatorName: string;
  status: 'ACTIVE' | 'CLOSED';
  createdAt: string | null;
  expiresAt: string | null;
  totalVotes: number;
  uniqueVoters: number;
  participationRate: number;
  lastUpdated: string | null;
}

export interface WinningOption {
  optionId: number;
  optionText: string;
  voteCount: number;
  votePercentage: number;
}

export interface RecentResultItem {
  pollId: number;
  title: string;
  creatorId: number;
  creatorName: string;
  status: 'ACTIVE' | 'CLOSED';
  totalVotes: number;
  uniqueVoters: number;
  participationRate: number;
  lastUpdated: string | null;
  winningOption: WinningOption;
}

export interface TopUser {
  userId: number;
  userName: string;
  totalVotesCast: number;
  pollsParticipated: number;
  pollsCreated: number;
  lastActive: string | null;
  lastUpdated: string | null;
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
