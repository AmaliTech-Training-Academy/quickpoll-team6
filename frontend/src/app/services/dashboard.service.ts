import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import {
  DashboardSummary,
  ActivePollItem,
  RecentResultItem,
  TopUser,
  PageResponse,
} from '@/models';
import { API_BASE_URL } from '@/constants';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly dashboardApiUrl = `${API_BASE_URL}/dashboard`;

  getSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.dashboardApiUrl}/summary`);
  }

  getActivePolls(page = 0, size = 10): Observable<PageResponse<ActivePollItem>> {
    return this.http.get<PageResponse<ActivePollItem>>(
      `${this.dashboardApiUrl}/active-polls?page=${page}&size=${size}`,
    );
  }

  getRecentResults(page = 0, size = 5): Observable<PageResponse<RecentResultItem>> {
    return this.http.get<PageResponse<RecentResultItem>>(
      `${this.dashboardApiUrl}/recent-results?page=${page}&size=${size}`,
    );
  }

  getTopUsers(page = 0, size = 10): Observable<PageResponse<TopUser>> {
    return this.http.get<PageResponse<TopUser>>(
      `${this.dashboardApiUrl}/top-users?page=${page}&size=${size}`,
    );
  }
}
