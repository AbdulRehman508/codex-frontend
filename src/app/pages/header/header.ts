import { Component, ElementRef, HostListener, ViewChild, inject } from '@angular/core';
import { Router } from '@angular/router';
import { commonIcons } from '../../core/icon-images/common-icon';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { officeList } from '../user-management/contant.json';
import { Menu } from 'primeng/menu';
@Component({
  selector: 'app-header',
  imports: [CommonModule, FormsModule, NgSelectModule, Menu],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})

export class Header {

  private router = inject(Router);

  ImageIcon = commonIcons
  dropdownOpen: boolean = false;
  officeList: any[] = officeList;

  @ViewChild('topBar') topBar!: ElementRef;

  menuItems = [
    {
      label: 'Profile',
      icon: 'pi pi-user',
      command: () => this.router.navigate(['/profile'])
    },
    {
      label: 'Logout',
      icon: 'pi pi-sign-out'
    }
  ];

  ngOnInit() {

  }



  @HostListener('document:click', ['$event'])
  clickOutside(event: MouseEvent) {
    if (this.dropdownOpen && !this.topBar.nativeElement.contains(event.target)) {
      this.dropdownOpen = false;
    }
  }
}
