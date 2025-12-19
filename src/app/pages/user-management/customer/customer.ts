import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { commonIcons } from '../../../core/icon-images/common-icon';
import { customer } from './customer.json';

@Component({
  selector: 'app-customer',
  imports: [CommonModule, FormsModule],
  templateUrl: './customer.html',
  styleUrl: './customer.scss',
})
export class Customer {

  searchByKeyword: string = '';
  commonIcon = commonIcons
  customerList: any[] = customer;
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
