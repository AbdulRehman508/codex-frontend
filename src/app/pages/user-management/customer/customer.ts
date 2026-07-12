import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { commonIcons } from '../../../core/icon-images/common-icon';
import { RouterModule } from '@angular/router';
import { PermissionService } from '../../../core/services/permission.service';

@Component({
  selector: 'app-customer',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './customer.html',
  styleUrl: './customer.scss',
})
export class Customer {

  perm = inject(PermissionService);
  // module this list is gated by (create/edit/delete checks in the template)
  readonly module = 'customer';

  searchByKeyword: string = '';
  commonIcon = commonIcons
  customerList: any[] = [];
  isTableHeaderChecked: boolean = false;
  ngOnInit() {
  }

  getCustomerList() {

  }
  clearSearch() {

  }
  filterRecord() {

  }

  checkAll() {
    console.log('isTableHeaderChecked', this.isTableHeaderChecked);
  }
}
