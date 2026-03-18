
import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule, FormGroup } from '@angular/forms';
import { commonIcons } from '../../../../core/icon-images/common-icon';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { officeList, roleList } from '../../contant.json';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-add-edit-staff',
  imports: [ReactiveFormsModule, FormsModule, CommonModule, NgSelectModule],
  templateUrl: './add-edit-staff.html',
  styleUrl: './add-edit-staff.scss',
})

export class AddEditStaff {


  staffForm: FormGroup = new FormGroup({});
  private _router = inject(Router);
  private _activeRoute = inject(ActivatedRoute);
  private _formBuilder = inject(FormBuilder);

  commonIcon = commonIcons
  submitted: boolean = false;
  pageTitle: string = 'Add Staff';
  hideShowPassword: boolean = false;
  roleList: any[] = roleList;
  officeList: any[] = officeList;
  validation_error: any[] = [];

  ngOnInit() {

    this._activeRoute.params.subscribe({
      next: params => {
        this.pageTitle = params['id'] ? 'Edit Staff' : 'Add Staff';
      },
    });

    this.staffForm = this._formBuilder.group({
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


  createCustomer() {
    if (this.staffForm.invalid) {
      this.submitted = true
      return
    } else {
      console.log('staffForm >>:', this.staffForm.valid, 'Value:', this.staffForm.value)
      this.submitted = false;
      this._router.navigateByUrl('/user-management/staff')
    }
  }

  closeCustomer() {
    this.staffForm.reset();
    this._router.navigateByUrl('/user-management/staff')
  }



  get strengthLevel(): 'Weak' | 'Medium' | 'Strong' {
    if (this.validation_error?.length === 3 || this.validation_error?.length === 4) return 'Weak';
    if (this.validation_error?.length === 1 || this.validation_error?.length === 2) return 'Medium';
    return 'Strong';
  }

  passwordCriteria() {
    this.validation_error = [];
    let password = this.staffForm.controls['password'].value;
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


}
