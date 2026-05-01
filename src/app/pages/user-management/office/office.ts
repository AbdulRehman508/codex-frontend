import { Component } from '@angular/core';
import { commonIcons } from '../../../core/icon-images/common-icon';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-office',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './office.html',
  styleUrl: './office.scss',
})
export class Office {


  searchByKeyword: string = '';
  commonIcon = commonIcons
  isTableHeaderChecked: boolean = false;

  ngOnInit() {

  }

  getOfficeList() {

  }
  clearSearch() {

  }
  filterRecord() {

  }

  checkAll() {
    console.log('isTableHeaderChecked', this.isTableHeaderChecked);
  }

}
