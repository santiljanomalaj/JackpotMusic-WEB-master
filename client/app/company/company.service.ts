import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import { URLSearchParams } from '@angular/http';
import { ConstantsService } from '../providers/constants.service';
import { Company } from './company';
import 'rxjs/add/operator/toPromise';

@Injectable()
export class CompanyService {
  companies: Company[] = [];

  constructor(
    private http: Http,
    public constants: ConstantsService,
  ) { }

  query(params: {} = {}): Promise<{itemCount: number, items: Company[]}> {
    let queryUrl = `${this.constants.API_BASE_URL}/companies`;

    const serializedParams = new URLSearchParams();
    for (const key in params) {
      if (params.hasOwnProperty(key)) {
        serializedParams.set(key, params[key]);
      }
    }

    queryUrl += serializedParams.toString();

    return this.http.get(queryUrl)
      .toPromise()
      .then((response) => response.json());
  }

  getById(id: string): Promise<Company> {
    const queryUrl = `${this.constants.API_BASE_URL}/companies/${id}`;

    return this.http.get(queryUrl)
      .toPromise()
      .then((response) => {
        return response.json();
      });
  }

  update(company: Company): Promise<Company> {
    const queryUrl = `${this.constants.API_BASE_URL}/companies/${company._id}`;
    return this.http.put(queryUrl, company)
      .toPromise()
      .then((response) => {
        return response.json();
      });
  }

  create(company: Company): Promise<Company> {
    const queryUrl = `${this.constants.API_BASE_URL}/companies`;

    return this.http.post(queryUrl, company)
      .toPromise()
      .then((response) => {
        return response.json();
      });
  }

  delete(company: Company): Promise<any> {
    const queryUrl = `${this.constants.API_BASE_URL}/companies/${company._id}`;

    return this.http.delete(queryUrl)
      .toPromise()
      .then((response) => {
        return response.json();
      });
  }
}
