import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { commonIcons } from '../../../core/icon-images/common-icon';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-customer',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './customer.html',
  styleUrl: './customer.scss',
})
export class Customer {

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
