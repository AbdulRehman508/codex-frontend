import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';

import { AuthApiService } from '../auth.api';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, TranslatePipe],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authApi = inject(AuthApiService);
  private toast = inject(MessageService);

  resetForm: FormGroup = new FormGroup({});
  submitted = false;
  loading = signal(false);
  password_visible = true;
  token = signal<string | null>(null);
  validation_error: string[] = [];

  ngOnInit() {
    this.token.set(this.route.snapshot.queryParamMap.get('token'));
    this.resetForm = new FormGroup({
      password: new FormControl('', [Validators.required]),
    });
  }

  /** rates what is in the field now, not what was typed into it */
  get strengthLevel(): 'Weak' | 'Medium' | 'Strong' {
    const failed = this.passwordFailures(this.resetForm.controls['password'].value).length;
    if (failed >= 3) return 'Weak';
    if (failed >= 1) return 'Medium';
    return 'Strong';
  }

  passwordCriteria() {
    this.validation_error = this.passwordFailures(this.resetForm.controls['password'].value);
    return this.validation_error;
  }

  /** the house password policy, as the list of rules this value breaks */
  private passwordFailures(password: string | null | undefined): string[] {
    const value = password ?? '';
    const failures: string[] = [];
    if (value.length < 12) {
      failures.push('Password must be at least 12 characters long');
    }
    if (!/[A-Z]/.test(value)) {
      failures.push('Password must contain at least one uppercase letter');
    }
    if (!/\d/.test(value)) {
      failures.push('Password must contain at least one numeric character');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
      failures.push('Password must contain at least one special character');
    }
    return failures;
  }

  submit() {
    this.submitted = true;
    const token = this.token();
    if (!token) {
      this.toast.add({ severity: 'error', summary: 'Invalid link', detail: 'Reset token is missing or invalid' });
      return;
    }
    if (this.resetForm.invalid || this.passwordCriteria().length) return;

    this.loading.set(true);
    this.authApi.resetPassword(token, this.resetForm.value.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.add({ severity: 'success', summary: 'Password updated', detail: 'You can now sign in' });
        this.router.navigateByUrl('/login');
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Reset failed' });
      },
    });
  }
}
