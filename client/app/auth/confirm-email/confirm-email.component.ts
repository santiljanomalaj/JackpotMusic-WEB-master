import { AuthService } from './../auth.service';
import { ActivatedRoute } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { ToastsManager } from 'ng2-toastr/ng2-toastr';

@Component({
  selector: 'auth-confirm-email',
  templateUrl: 'confirm-email.component.html',
})
export class ConfirmEmailComponent implements OnInit {

  errorMessage: string;
  isConfirmed: boolean = false;
  isRequestCompleted: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private toastr: ToastsManager,
    private authService: AuthService,
  ) { }

  ngOnInit() {
    this.route.params.subscribe(
      async ({ token }) => await this.confirmToken(token),
    );
  }

  async confirmToken(token: string): Promise<void> {
    try {
      const { message } = await this.authService.confirmEmailToken(token);
      this.isConfirmed = true;
      this.toastr.success(message, 'Success!');
    } catch (response) {
      this.isConfirmed = false;
      const { message } = response.json();
      if (message) {
        this.errorMessage = message;
        this.toastr.error(message, 'Whoops!');
      } else {
        this.errorMessage = 'We could not confirm your email, please try again!';
        this.toastr.error(this.errorMessage, 'Whoops!');
      }
    }

    this.isRequestCompleted = true;
  }

}
