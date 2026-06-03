import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule, FormGroup } from '@angular/forms';
import { commonIcons } from '../../core/icon-images/common-icon';
import { CommonModule } from '@angular/common';
import { officeList, roleList } from '../user-management/contant.json';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, FormsModule, CommonModule, NgSelectModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})

export class Profile {

  profileForm: FormGroup = new FormGroup({});
  private _formBuilder = inject(FormBuilder);

  commonIcon = commonIcons
  submitted: boolean = false;
  pageTitle: string = 'My Profile';
  hideShowPassword: boolean = false;
  roleList: any[] = roleList;
  officeList: any[] = officeList;
  validation_error: any[] = [];

  ngOnInit() {
    this.profileForm = this._formBuilder.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.email]],
      officeId: [null, [Validators.required]],
      roleId: [null, [Validators.required]],
      mobile_no: ['', Validators.required],
      cnic_no: ['', Validators.required],
      address: ['', Validators.required],
      biography: [''],
    });
  }

  saveProfile() {
    if (this.profileForm.invalid) {
      this.submitted = true
      return
    } else {
      console.log('profileForm >>:', this.profileForm.valid, 'Value:', this.profileForm.value)
      this.submitted = false;
    }
  }

  resetProfile() {
    this.profileForm.reset();
  }

  get strengthLevel(): 'Weak' | 'Medium' | 'Strong' {
    if (this.validation_error?.length === 3 || this.validation_error?.length === 4) return 'Weak';
    if (this.validation_error?.length === 1 || this.validation_error?.length === 2) return 'Medium';
    return 'Strong';
  }

  passwordCriteria() {
    this.validation_error = [];
    let password = this.profileForm.controls['password'].value;
    if (password?.length < 12) {
      this.validation_error.push('Password must be at least 12 characters long');
    }
    if (!/[A-Z]/.test(password || '')) {
      this.validation_error.push('Password must contain at least one uppercase letter');
    }
    if (!/\d/.test(password || '')) {
      this.validation_error.push('Password must contain at least one numeric character');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password || '')) {
      this.validation_error.push('Password must contain at least one special character');
    }
    return this.validation_error;
  }

  officeLogo = signal<string | null>(null);
  onSelectFile(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length) {
      const file = target.files[0];
      const fileReader: FileReader = new FileReader();
      fileReader.readAsDataURL(file);
      fileReader.onload = (e: any) => {
        this.officeLogo.set(e.target.result);
      };
    }
    target.value = '';
  }

}
