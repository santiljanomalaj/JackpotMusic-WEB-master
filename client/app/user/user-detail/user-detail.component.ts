import { Component } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';

@Component({
  selector: 'app-user-detail',
  templateUrl: 'user-detail.component.html',
  styleUrls: ['./user-detail.component.scss'],
})

export class UserDetailComponent {
  jackpotAmount: string = '$10,350';
  gameUrl: string = 'Jackpot.game/';
  scheduledGames: any;

  constructor(
    public router: Router,
    public activateRoute: ActivatedRoute,
  ) { }

}
