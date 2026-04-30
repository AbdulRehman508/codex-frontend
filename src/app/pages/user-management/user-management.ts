import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { commonIcons } from '../../core/icon-images/common-icon';

@Component({
  selector: 'app-user-management',
  imports: [CommonModule, RouterModule],
  templateUrl: './user-management.html',
  styleUrl: './user-management.scss',
})
export class UserManagement {


  user_menu: any[] = [];
  ImageIcon = commonIcons

  ngOnInit() {

    this.user_menu = [
      {
        label: 'Customer',
        icon: this.ImageIcon.customer_icon,
        url: '/user-management/customer'
      },
      {
        label: 'Office',
        icon: this.ImageIcon.office_icon,
        url: '/user-management/office'
      },
      {
        label: 'Staff',
        icon: this.ImageIcon.staff_icon,
        url: '/user-management/staff'
      },
    ];
  }
}
