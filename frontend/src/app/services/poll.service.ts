import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { ClosePollResponse, Poll, PollResult, PollTimeseriesResponse } from '@/models';
import { API_BASE_URL } from '@/constants';

export interface CastVoteRequest {
  optionIds: number[];
}

export interface CastVoteResponse {
  success: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class PollService {
  private readonly http = inject(HttpClient);
  private readonly pollsApiUrl = `${API_BASE_URL}/polls`;
  private readonly votesApiUrl = `${API_BASE_URL}/votes`;

  getAll(page = 0, size = 10): Observable<any> {
    return this.http.get(`${this.pollsApiUrl}/my-polls?page=${page}&size=${size}`);
  }

  getUserCreatedPolls(page = 0, size = 10): Observable<any> {
    return this.http.get(`${this.pollsApiUrl}/my-created-polls?page=${page}&size=${size}`);
  }

  getById(id: number): Observable<any> {
    return this.http.get(`${this.pollsApiUrl}/${id}`);
  }

  getResults(id: number): Observable<PollResult> {
    return this.http.get<PollResult>(`${this.pollsApiUrl}/${id}/results`);
  }

  getResultsTimeseries(id: number, from?: string, to?: string): Observable<PollTimeseriesResponse> {
    let url = `${this.pollsApiUrl}/${id}/results/timeseries`;
    const params: string[] = [];
    if (from) params.push(`from=${from}`);
    if (to) params.push(`to=${to}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return this.http.get<PollTimeseriesResponse>(url);
  }

  create(poll: any): Observable<any> {
    return this.http.post(this.pollsApiUrl, poll);
  }

  castVote(pollId: number, optionIds: number[]): Observable<CastVoteResponse> {
    return this.http.post<CastVoteResponse>(`${this.votesApiUrl}/polls/${pollId}`, {
      optionIds,
    });
  }

  closePoll(id: number): Observable<ClosePollResponse> {
    return this.http.put<ClosePollResponse>(`${this.pollsApiUrl}/${id}/close`, {});
  }

  deletePoll(id: number): Observable<void> {
    return this.http.delete<void>(`${this.pollsApiUrl}/${id}`);
  }
}
