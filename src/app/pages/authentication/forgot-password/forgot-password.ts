import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';

import { AuthApiService } from '../auth.api';

@Component({
  selector: 'app-forgot-password',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  @Input() email: any = null;
  @Output() moveToLogin = new EventEmitter<any>();

  private authApi = inject(AuthApiService);
  private toast = inject(MessageService);

  forgotForm: FormGroup = new FormGroup({});
  submitted = false;
  loading = signal(false);
  sent = signal(false);

  ngOnInit(): void {
    this.forgotForm = new FormGroup({
      email: new FormControl(this.email ?? '', [Validators.required, Validators.email]),
    });
  }

  /** Request a reset link. Backend always 200s (does not reveal account existence). */
  resetPassword() {
    this.submitted = true;
    if (this.forgotForm.invalid) return;

    this.loading.set(true);
    this.authApi.forgotPassword(this.forgotForm.value.email).subscribe({
      next: () => {
        this.loading.set(false);
        this.sent.set(true);
        this.toast.add({ severity: 'success', summary: 'Check your email', detail: 'If the email exists, a reset link has been sent' });
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message ?? 'Request failed' });
      },
    });
  }

  moveLogin() {
    this.moveToLogin.emit(true);
  }
}
