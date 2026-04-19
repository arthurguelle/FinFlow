import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, Expense, Summary, PdfExtractResponse, Movement } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly url = `${environment.apiUrl}/expenses`;

  constructor(private http: HttpClient) {}

  getAll(year?: number, month?: number): Observable<ApiResponse<Expense[]>> {
    let params = new HttpParams();
    if (year) params = params.set('year', year);
    if (month) params = params.set('month', month);
    return this.http.get<ApiResponse<Expense[]>>(this.url, { params });
  }

  getSummary(year?: number, month?: number): Observable<ApiResponse<Summary>> {
    let params = new HttpParams();
    if (year) params = params.set('year', year);
    if (month) params = params.set('month', month);
    return this.http.get<ApiResponse<Summary>>(`${this.url}/summary`, { params });
  }

  create(data: Partial<Expense>): Observable<ApiResponse<Expense>> {
    return this.http.post<ApiResponse<Expense>>(this.url, data);
  }

  update(id: string, data: Partial<Expense>): Observable<ApiResponse<Expense>> {
    return this.http.put<ApiResponse<Expense>>(`${this.url}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  extractFromPdf(file: File, password?: string): Observable<ApiResponse<PdfExtractResponse>> {
    const form = new FormData();
    form.append('file', file);
    if (password) form.append('password', password);
    return this.http.post<ApiResponse<PdfExtractResponse>>(`${this.url}/extract-pdf`, form);
  }

  extractFromText(text: string): Observable<ApiResponse<PdfExtractResponse>> {
    return this.http.post<ApiResponse<PdfExtractResponse>>(`${this.url}/extract-text`, { text });
  }

  bulkClassify(ids: string[], movementId: string | null): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${this.url}/bulk-classify`, { ids, movementId });
  }

  bulkDelete(ids: string[]): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${this.url}/bulk-delete`, { ids });
  }
}

@Injectable({ providedIn: 'root' })
export class MovementService {
  private readonly url = `${environment.apiUrl}/movements`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<Movement[]>> {
    return this.http.get<ApiResponse<Movement[]>>(this.url);
  }

  create(data: Partial<Movement>): Observable<ApiResponse<Movement>> {
    return this.http.post<ApiResponse<Movement>>(this.url, data);
  }

  update(id: string, data: Partial<Movement>): Observable<ApiResponse<Movement>> {
    return this.http.put<ApiResponse<Movement>>(`${this.url}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
