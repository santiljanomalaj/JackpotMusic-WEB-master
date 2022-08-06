import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Company } from '../company';
import { CompanyService } from '../company.service';
import 'rxjs/add/operator/switchMap';

@Component({
  selector: 'app-company-detail',
  templateUrl: './company-detail.component.html',
  styleUrls: ['./company-detail.component.scss'],
})
export class CompanyDetailComponent implements OnInit {
  company: Company;

  constructor(
    private companyService: CompanyService,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.route.params
      .switchMap((params: Params) => this.companyService.getById(params.id))
      .subscribe((company) => this.company = company);
  }

  deleteItem(company: Company) {
    this.companyService.delete(company)
      .then((response) => {
        this.router.navigate(['/companies']);
      })
      .catch((err) => {
        console.error(err);
      });
  }
}
