import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { commonIcons } from '../../core/icon-images/common-icon';

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})

export class Header {

  ImageIcon = commonIcons
  dropdownOpen: boolean = false;
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
