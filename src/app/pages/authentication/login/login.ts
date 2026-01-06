import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { ForgotPassword } from '../forgot-password/forgot-password';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ForgotPassword],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})

export class Login implements OnInit {

  password_visible: boolean = true;
  forgot_password_visible: boolean = false;
  loginForm: FormGroup = new FormGroup({});
  submitted: boolean = false;
  ngOnInit(): void {
    this.initializeLoginForm();
  }

  initializeLoginForm() {
    this.loginForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required]),
      remember_me: new FormControl(false, [Validators.required, Validators.requiredTrue]),
    });
  }


  submitForm() {
    console.log('status >>:', this.loginForm.valid, 'Value:', this.loginForm.value)

    if (this.loginForm.invalid) {
      this.submitted = true
      return
    } else {
      this.submitted = false;
      console.log('Value:', this.loginForm.value)
    }
  }

  showLogin(event:boolean = false) {
    event && (this.forgot_password_visible = false);
  }
}
