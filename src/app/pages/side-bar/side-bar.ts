import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-side-bar',
  imports: [RouterModule, CommonModule],
  templateUrl: './side-bar.html',
  styleUrl: './side-bar.scss',
})
export class SideBar {

  side_menu: any[] = [];
  activeRoute: string = '';

  constructor(private router: Router) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.activeRoute = event.urlAfterRedirects;
      }
    });
  }

  ngOnInit() {

    this.side_menu = [
      {
        label: 'Dashboard',
        icon: 'assets/side_menu/home.svg',
        url: '/dashboard',
        isExact: true
      },
      {
        label: 'Product',
        icon: 'assets/side_menu/list.svg',
        url: '/product'
      },
      {
        label: 'Stock',
        icon: 'assets/side_menu/task.svg',
        url: '/stock'
      },
      {
        label: 'Report',
        icon: 'assets/side_menu/report.svg',
        url: '/report'
      },
      {
        label: 'Location',
        icon: 'assets/side_menu/location.svg',
        url: '/location'
      },
      {
        label: 'Trace Product',
        icon: 'assets/side_menu/find.svg',
        url: '/trace-product'
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
