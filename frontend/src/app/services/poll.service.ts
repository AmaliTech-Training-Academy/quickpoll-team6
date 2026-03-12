import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { PollResult } from '@/models';
import { API_BASE_URL } from '@/constants';

@Injectable({ providedIn: 'root' })
export class PollService {
  private apiUrl = `${API_BASE_URL}/polls`;

  constructor(private http: HttpClient) {}

  getAll(page = 0, size = 10): Observable<any> {
    return this.http.get(`${this.apiUrl}/my-polls?page=${page}&size=${size}`);
  }

  getById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  getResults(id: number): Observable<PollResult> {
    return this.http.get<PollResult>(`${this.apiUrl}/${id}/results`);
  }

  create(poll: any): Observable<any> {
    return this.http.post(this.apiUrl, poll);
  }

  // TODO: Implement vote method
  // vote(pollId: number, optionIds: number[]): Observable<any> { ... }

  // TODO: Implement close poll method
}
