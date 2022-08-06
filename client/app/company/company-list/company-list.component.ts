import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Company } from '../company';
import { CompanyService } from '../company.service';

@Component({
  selector: 'app-company-list',
  templateUrl: './company-list.component.html',
  styleUrls: ['./company-list.component.scss'],
})
export class CompanyListComponent implements OnInit {
  companies: Company[];

  constructor(
    private companyService: CompanyService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.findAll();
  }

  findAll(): void {
    this.companyService.query()
      .then((response) => {
        this.companies = response.items;
      });
  }

  gotoDetail(company: Company): void {
    console.log('selected company', company);
    this.router.navigate(['/companies', company._id]);
  }
}
