import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { CompanyListComponent } from './company/company-list/company-list.component';
import { CompanyDetailComponent } from './company/company-detail/company-detail.component';
import { CompanyEditComponent } from './company/company-edit/company-edit.component';
import { CompanyNewComponent } from './company/company-new/company-new.component';

import { LayoutComponent } from './layout/layout.component';

import { UserDetailComponent } from './user/user-detail/user-detail.component';

import { GameNewComponent } from './game/game-new/game-new.component';

const ROUTES: Routes = [
  { path: '', redirectTo: '/admin/User', pathMatch: 'full' },
  // { path: '', redirectTo: 'host', pathMatch: 'full' },
  // { path: '', component: LayoutComponent, children: [
  //     { path: 'host',  component: UserDetailComponent },
  //     { path: 'host/game/new', component: GameNewComponent },
  //   ],
  // },
];

@NgModule({
  imports: [ RouterModule.forRoot(ROUTES) ],
  exports: [ RouterModule ],
})
export class AppRoutingModule { }
