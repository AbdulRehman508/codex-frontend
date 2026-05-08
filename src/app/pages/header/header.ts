import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { commonIcons } from '../../core/icon-images/common-icon';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { officeList } from '../user-management/contant.json';

@Component({
  selector: 'app-header',
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})

export class Header {

  ImageIcon = commonIcons
  dropdownOpen: boolean = false;
  officeList: any[] = officeList;

  @ViewChild('topBar') topBar!: ElementRef;



  ngOnInit() {

  }



  @HostListener('document:click', ['$event'])
  clickOutside(event: MouseEvent) {
    if (this.dropdownOpen && !this.topBar.nativeElement.contains(event.target)) {
      this.dropdownOpen = false;
    }
  }
}
