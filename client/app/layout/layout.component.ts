import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';

@Component({
  selector: 'app-layout-component',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
})
export class LayoutComponent implements OnInit {

  ngOnInit() {
    //
  }

  constructor(
    public router: Router,
    public activateRoute: ActivatedRoute,
  ) {}
}
