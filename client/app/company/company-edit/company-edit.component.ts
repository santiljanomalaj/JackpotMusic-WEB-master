import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { CompanyService } from '../company.service';
import { Company } from '../company';
import 'rxjs/add/operator/switchMap';

@Component({
  selector: 'app-company-edit',
  templateUrl: './company-edit.component.html',
  styleUrls: ['./company-edit.component.scss'],
})
export class CompanyEditComponent implements OnInit {
  company: Company;
  submitFunction: Function;

  constructor(
    private companyService: CompanyService,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  ngOnInit() {
    this.route.params
      .switchMap((params: Params) => this.companyService.getById(params.id))
      .subscribe((company) => this.company = company);

    // Bind 'this' since the submit function is a callback
    this.submitFunction = this.submit.bind(this);
  }

  submit(company: Company) {
    if (company) {
      this.companyService.update(company)
        .then((response) => {
          this.router.navigate(['/companies', company._id]);
        })
        .catch((error) => {
          console.error(error);
        });
    }
  }
}
