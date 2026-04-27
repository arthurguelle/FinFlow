import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RagSuggestion {
  category: string;
  averageSpent: number;
  suggestedAmount: number;
  tip: string | null;
}

export interface RagSuggestionsResponse {
  data: RagSuggestion[];
  success: boolean;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class RagService {
  private readonly url = `${environment.apiUrl}/rag`;

  constructor(private http: HttpClient) {}

  getSuggestions(userId: string): Observable<RagSuggestionsResponse> {
    return this.http.get<RagSuggestionsResponse>(`${this.url}/suggestions/${userId}`);
  }
}
