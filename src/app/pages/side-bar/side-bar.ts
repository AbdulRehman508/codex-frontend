import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-side-bar',
  imports: [RouterModule],
  templateUrl: './side-bar.html',
  styleUrl: './side-bar.scss',
})
export class SideBar {


  side_menu: any[] = [];

  ngOnInit() {

    this.side_menu = [
      {
        label: 'Dashboard',
        icon: 'assets/side_menu/home.svg',
        url: '/dashboard'
      },
      {
        label: 'Product',
        icon: 'assets/side_menu/list.svg',
        url: '/product'
      },
      {
        label: 'Stock',
        icon: 'assets/side_menu/task.svg',
        url: '/product'
      },
      {
        label: 'Report',
        icon: 'assets/side_menu/report.svg',
        url: '/user-management'
      },
      {
        label: 'Location',
        icon: 'assets/side_menu/location.svg',
        url: '/location'
      },
      {
        label: 'Trace Product',
        icon: 'assets/side_menu/find.svg',
        url: '/location'
      },
      {
        label: 'User Management',
        icon: 'assets/side_menu/user.svg',
        url: '/user-management'
      },
      {
        label: 'Setting',
        icon: 'assets/side_menu/setting.svg',
        url: '/setting'
      },
    ];
  }

}
