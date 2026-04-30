import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule, FormGroup } from '@angular/forms';
import { commonIcons } from '../../../../core/icon-images/common-icon';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { membershipList, membershipType } from '../../contant.json';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-add-edit-office',
  imports: [ReactiveFormsModule, FormsModule, CommonModule, NgSelectModule],
  templateUrl: './add-edit-office.html',
  styleUrl: './add-edit-office.scss',
})

export class AddEditOffice {

  officeForm: FormGroup = new FormGroup({});
  private _router = inject(Router);
  private _activeRoute = inject(ActivatedRoute);
  private _formBuilder = inject(FormBuilder);
  private _cdr = inject(ChangeDetectorRef);

  commonIcon = commonIcons
  submitted: boolean = false;
  pageTitle: string = 'Add Office';

  membershipList: any[] = membershipList;
  membershipType: any[] = membershipType;

  ngOnInit() {

    this._activeRoute.params.subscribe({
      next: params => {
        this.pageTitle = params['id'] ? 'Edit Office' : 'Add Office';
      },
    });

    this.officeForm = this._formBuilder.group({
      office_name: ['', Validators.required],
      office_email: ['', [Validators.required, Validators.email]],
      office_mobile_no: ['', Validators.required],
      membership_level: [null, Validators.required],
      membership_type: [null, Validators.required],
      licence_no: [''],
      approved: [''],
      office_address: ['', Validators.required],
      biography: [''],
    });
  }


  createCustomer() {
    if (this.officeForm.invalid) {
      this.submitted = true
      return
    } else {
      console.log('officeForm >>:', this.officeForm.valid, 'Value:', this.officeForm.value)
      this.submitted = false;
      this._router.navigateByUrl('/user-management/office')
    }
  }

  closeCustomer() {
    this.officeForm.reset();
    this._router.navigateByUrl('/user-management/office')
  }

  officeLogo: any = null;
  onSelectFileLR(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length) {
      const file = target.files[0];
      // const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      const fileReader: FileReader = new FileReader();
      fileReader.readAsDataURL(file);
      fileReader.onload = (e: any) => {
        this.officeLogo = e.target.result;
        this._cdr.detectChanges();
      };
    }
    target.value = '';
  }
}
