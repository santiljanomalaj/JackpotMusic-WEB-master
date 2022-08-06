import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Http, BrowserXhr } from '@angular/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { SnapJSAdminModule } from '@snapmobile/snapjs-admin';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { AuthModule } from './auth/auth.module';
import { ControlErrorsModule } from './shared/control-errors/control-errors.module';
import { ToastModule } from 'ng2-toastr/ng2-toastr';
import { NgProgressModule, NgProgressBrowserXhr } from 'ngx-progressbar';

import { CompanyService } from './company/company.service';
import { CompanyListComponent } from './company/company-list/company-list.component';
import { CompanyDetailComponent } from './company/company-detail/company-detail.component';
import { CompanyEditComponent } from './company/company-edit/company-edit.component';
import { CompanyFormComponent } from './company/company-form/company-form.component';
import { CompanyNewComponent } from './company/company-new/company-new.component';

import { LayoutComponent } from './layout/layout.component';

import { UserDetailComponent } from './user/user-detail/user-detail.component';

import { GameNewComponent } from './game/game-new/game-new.component';

import { ExtendedHttpService } from './providers/extended-http.service';
import { ConstantsService } from './providers/constants.service';

import { Angulartics2Module, Angulartics2GoogleAnalytics } from 'angulartics2';

@NgModule({
  declarations: [
    AppComponent,
    CompanyListComponent,
    CompanyDetailComponent,
    CompanyEditComponent,
    CompanyFormComponent,
    CompanyNewComponent,
    LayoutComponent,
    UserDetailComponent,
    GameNewComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    SnapJSAdminModule.forRoot(ConstantsService),
    AuthModule,
    ControlErrorsModule,
    ToastModule.forRoot(),
    NgProgressModule,
    Angulartics2Module.forRoot([ Angulartics2GoogleAnalytics ]),
  ],
  providers: [
    CompanyService,
    ConstantsService,
    { provide: Http, useClass: ExtendedHttpService },
    { provide: BrowserXhr, useClass: NgProgressBrowserXhr },
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
