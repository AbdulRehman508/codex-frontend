import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { commonIcons } from '../../core/icon-images/common-icon';

@Component({
  selector: 'app-side-bar',
  imports: [RouterModule, CommonModule],
  templateUrl: './side-bar.html',
  styleUrl: './side-bar.scss',
})
export class SideBar {

  side_menu: any[] = [];
  activeRoute: string = '';
  ImageIcon = commonIcons

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
        icon: this.ImageIcon.home_icon,
        url: '/dashboard',
      },
      {
        label: 'Product',
        icon: this.ImageIcon.list_icon,
        url: '/product'
      },
      {
        label: 'Sales',
        icon: this.ImageIcon.report_icon,
        url: '/sales'
      },
      {
        label: 'Stock',
        icon: this.ImageIcon.stock_icon,
        url: '/stock'
      },
      {
        label: 'Report',
        icon: this.ImageIcon.report_icon,
        url: '/report'
      },
      {
        label: 'Location',
        icon: this.ImageIcon.location_icon,
        url: '/location'
      },
      {
        label: 'Trace Product',
        icon: this.ImageIcon.find_icon,
        url: '/trace-product'
      },
      {
        label: 'User Management',
        icon: this.ImageIcon.user_icon,
        url: '/user-management'
      },
      {
        label: 'Setting',
        icon: this.ImageIcon.setting_icon,
        url: '/setting'
      },
    ];
  }

}
