import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-game-new',
  templateUrl: 'game-new.component.html',
  styleUrls: ['./game-new.component.scss'],
})

export class GameNewComponent {
  form: FormGroup;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
  ){
    this.form = this.formBuilder.group({
       amount: [''],
       date: [''],
       time: [''],
    });
  }
}
