import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-user-management',
  imports: [CommonModule, RouterModule],
  templateUrl: './user-management.html',
  styleUrl: './user-management.scss',
})
export class UserManagement {


  user_menu: any[] = [];

  ngOnInit() {

    this.user_menu = [
      {
        label: 'Customer',
        icon: 'assets/icon/staff_card.svg',
        url: '/user-management/customer'
      },
      {
        label: 'Office',
        icon: 'assets/icon/office_icon.svg',
        url: '/user-management/office'
      },
      {
        label: 'Staff',
        icon: 'assets/icon/staff.svg',
        url: '/user-management/staff'
      },
      {
        label: 'Role',
        icon: 'assets/icon/domain.svg',
        url: '/user-management/role'
      },
      {
        label: 'Access Control',
        icon: 'assets/icon/lock.svg',
        url: '/user-management/access'
      },
    ];
  }
}
