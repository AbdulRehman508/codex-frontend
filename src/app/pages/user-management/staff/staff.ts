import { Component } from '@angular/core';
import { commonIcons } from '../../../core/icon-images/common-icon';
import { customer, roleList } from '../contant.json';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-staff',
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule],
  templateUrl: './staff.html',
  styleUrl: './staff.scss',
})

export class Staff {
  searchByKeyword: string = '';
  searchByRole: any = null;
  commonIcon = commonIcons
  customerList: any[] = customer;
  roleList: any[] = roleList;

  isTableHeaderChecked: boolean = false;
  ngOnInit() {
    console.log('customerList', this.customerList);
  }

  getCustomerList() {

  }
  clearSearch() {

  }
  filterRecord() {

  }

  checkAll() {
    console.log('isTableHeaderChecked', this.isTableHeaderChecked);
    console.log('customerList', this.customerList);
    this.customerList.forEach((item: any) => item.isChecked = this.isTableHeaderChecked);
  }
}
