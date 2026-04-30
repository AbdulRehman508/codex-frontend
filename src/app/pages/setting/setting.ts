import { Component } from '@angular/core';
import { commonIcons } from '../../core/icon-images/common-icon';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-setting',
  imports: [CommonModule, RouterModule],
  templateUrl: './setting.html',
  styleUrl: './setting.scss',
})
export class Setting {


  setting_menu: any[] = [];
  ImageIcon = commonIcons

  ngOnInit() {

    this.setting_menu = [
      {
        label: 'Access Control',
        icon: this.ImageIcon.lock_icon,
        url: '/setting/access'
      },
      {
        label: 'Role',
        icon: this.ImageIcon.role_icon,
        url: '/setting/role'
      },
    ];
  }
}
