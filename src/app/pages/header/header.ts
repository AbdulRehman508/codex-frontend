import { Component } from '@angular/core';

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {

  icon: string = 'assets/side_menu/home.svg';
  side_menu: any[] = [];


  ngOnInit() {

    this.side_menu = [
      {
        label: 'Dashboard',
        icon: 'assets/side_menu/home.svg',
        url: '/dashboard'
      },
      {
        label: 'Product List',
        icon: 'assets/side_menu/list.svg',
        url: '/product-list'
      },
      {
        label: 'Find Product',
        icon: 'assets/side_menu/task.svg',
        url: '/find-product'
      },
      {
        label: 'User Management',
        icon: 'assets/side_menu/user.svg',
        url: '/user-management'
      },
      {
        label: 'Location',
        icon: 'assets/side_menu/location.svg',
        url: '/location'
      },
      {
        label: 'Setting',
        icon: 'assets/side_menu/setting.svg',
        url: '/setting'
      },
    ];
  }
}
