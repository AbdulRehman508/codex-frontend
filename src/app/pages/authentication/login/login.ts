import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { ForgotPassword } from '../forgot-password/forgot-password';
import { AuthApiService } from '../auth.api';
import { TokenService } from '../../../core/services/token.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ForgotPassword],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})

export class Login implements OnInit {
  private authApi = inject(AuthApiService);
  private token = inject(TokenService);
  private router = inject(Router);
  private toast = inject(MessageService);

  password_visible: boolean = true;
  forgot_password_visible: boolean = false;
  loginForm: FormGroup = new FormGroup({});
  submitted: boolean = false;
  loading = signal(false);

  ngOnInit(): void {
    this.initializeLoginForm();
  }

  initializeLoginForm() {
    this.loginForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required]),
      remember_me: new FormControl(false),
    });
  }

  submitForm() {
    this.submitted = true;
    if (this.loginForm.invalid) return;

    this.loading.set(true);
    this.authApi.login(this.loginForm.value).subscribe({
      next: (data) => {
        this.token.setToken(data.token);
        this.token.setUser(data.user);
        this.loading.set(false);
        this.router.navigateByUrl('/');
      },
      error: (err) => {
        this.loading.set(false);
        const msg =
          err?.status === 403
            ? 'Account is inactive'
            : err?.status === 401
              ? 'Invalid email or password'
              : err?.error?.message ?? 'Login failed';
        this.toast.add({ severity: 'error', summary: 'Login failed', detail: msg });
      },
    });
  }

  showLogin(event: boolean = false) {
    event && (this.forgot_password_visible = false);
  }
}
