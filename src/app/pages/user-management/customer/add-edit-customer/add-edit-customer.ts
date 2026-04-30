import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule, FormGroup } from '@angular/forms';
import { commonIcons } from '../../../../core/icon-images/common-icon';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-add-edit-customer',
  imports: [ReactiveFormsModule, FormsModule, CommonModule],
  templateUrl: './add-edit-customer.html',
  styleUrl: './add-edit-customer.scss',
})

export class AddEditCustomer {

  customerForm: FormGroup = new FormGroup({});
  private _router = inject(Router);
  private _activeRoute = inject(ActivatedRoute);
  private _formBuilder = inject(FormBuilder);

  commonIcon = commonIcons
  submitted: boolean = false;
  pageTitle: string = 'Add Customer';
  ngOnInit() {

    this._activeRoute.params.subscribe({
      next: params => {
        this.pageTitle = params['id'] ? 'Edit Customer' : 'Add Customer';
      },
    });

    this.customerForm = this._formBuilder.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      mobile_no: ['', Validators.required],
      cnic_no: ['', Validators.required],
      address: ['', Validators.required],
      biography: [''],
    });
  }


  createCustomer() {
    if (this.customerForm.invalid) {
      this.submitted = true
      return
    } else {
      console.log('customerForm >>:', this.customerForm.valid, 'Value:', this.customerForm.value)
      this.submitted = false;
      this._router.navigateByUrl('/user-management/customer')
    }
  }

  closeCustomer() {
    this.customerForm.reset();
    this._router.navigateByUrl('/user-management/customer')
  }
}
