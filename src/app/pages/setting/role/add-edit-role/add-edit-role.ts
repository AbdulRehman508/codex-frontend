
import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule, FormGroup } from '@angular/forms';
import { commonIcons } from '../../../../core/icon-images/common-icon';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-add-edit-role',
  imports: [ReactiveFormsModule, FormsModule, CommonModule, NgSelectModule],
  templateUrl: './add-edit-role.html',
  styleUrl: './add-edit-role.scss',
})

export class AddEditRole {


  roleForm: FormGroup = new FormGroup({});
  private _router = inject(Router);
  private _activeRoute = inject(ActivatedRoute);
  private _formBuilder = inject(FormBuilder);

  commonIcon = commonIcons
  submitted: boolean = false;
  pageTitle: string = 'Add Role';
  hideShowPassword: boolean = false;

  validation_error: any[] = [];

  ngOnInit() {

    this._activeRoute.params.subscribe({
      next: params => {
        this.pageTitle = params['id'] ? 'Edit Roled' : 'Add Role';
      },
    });

    this.roleForm = this._formBuilder.group({
      role_name: ['', Validators.required],
      description: [''],
    });
  }


  createRole() {
    if (this.roleForm.invalid) {
      this.submitted = true
      return
    } else {
      console.log('staffForm >>:', this.roleForm.valid, 'Value:', this.roleForm.value)
      this.submitted = false;
      this._router.navigateByUrl('setting/role')
    }
  }

  closeRole() {
    this.roleForm.reset();
    this._router.navigateByUrl('setting/role')
  }

}
