import { Component } from '@angular/core';
import { Header } from '../../pages/header/header';
import { SideBar } from '../../pages/side-bar/side-bar';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-layout',
  imports: [Header, SideBar, RouterOutlet, CommonModule],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {

}
