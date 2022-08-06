import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators, FormArray } from '@angular/forms';
import { Company } from '../company';

@Component({
  selector: 'app-company-form',
  templateUrl: './company-form.component.html',
  styleUrls: ['./company-form.component.scss'],
})
export class CompanyFormComponent implements OnInit {
  form: FormGroup;
  formSubmitted: boolean = false;
  @Input() company: Company;
  @Input() submitFunction: Function;

  constructor(
    private formBuilder: FormBuilder,
  ) { }

  ngOnInit() {
    this.form = this.formBuilder.group({
      _id: ['', Validators.compose([])],
      name: ['', Validators.compose([Validators.required])],
      info: ['', Validators.compose([Validators.required])],
      avatar: ['', Validators.compose([])],
      images: this.formBuilder.array([]),
      file: ['', Validators.compose([])],
      files: this.formBuilder.array([]),
    });

    if (this.company) {
      this.form.patchValue({
        _id: this.company._id,
        name: this.company.name,
        info: this.company.info,
        avatar: this.company.avatar,
        file: this.company.file,
      });

      // Add images and files as FormArray controls
      if (this.company.images.length) {
        this.company.images.map((file) => {
          this.addItem(file, 'images');
        });
      }

      if (this.company.files.length) {
        this.company.files.map((file) => {
          this.addItem(file, 'files');
        });
      }
    }
  }

  submit() {
    this.formSubmitted = true;
    if (this.form.valid && this.submitFunction) {
      this.submitFunction(this.form.value);
    }
  }

  addItem(item: any = {}, controlField: string) {
    const control = <FormArray>this.form.controls[controlField];
    control.push(this.initItem(item));
  }

  removeItem(i: number, controlField: string) {
    const control = <FormArray>this.form.controls[controlField];
    control.removeAt(i);
  }

  initItem(item: any = {}) {
    const formGroup = this.formBuilder.group({});
    const keys = Object.keys(item);

    keys.forEach((key) => {
      formGroup.registerControl(key, new FormControl(item[key] || ''));
    });

    return formGroup;
  }
}
