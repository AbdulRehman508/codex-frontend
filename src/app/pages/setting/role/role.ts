import { Component } from '@angular/core';
import { commonIcons } from '../../../core/icon-images/common-icon';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-role',
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule],
  templateUrl: './role.html',
  styleUrl: './role.scss',
})
export class Role {


  searchByKeyword: string = '';
  commonIcon = commonIcons
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
