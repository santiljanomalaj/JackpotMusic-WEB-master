import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CompanyService } from '../company.service';
import { Company } from '../company';

@Component({
  selector: 'app-company-new',
  templateUrl: './company-new.component.html',
  styleUrls: ['./company-new.component.scss'],
})
export class CompanyNewComponent implements OnInit {
  submitFunction: Function;

  constructor(
    private router: Router,
    private companyService: CompanyService,
  ) { }

  ngOnInit() {
    // Bind 'this' since the submit function is a callback
    this.submitFunction = this.submit.bind(this);
  }

  submit(company: Company) {
    this.companyService.create(company)
      .then((response) => {
        this.router.navigate(['/companies']);
      })
      .catch((error) => {
        console.error(error);
      });
  }
}
