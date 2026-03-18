import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-forgot-password',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {

  @Input() email: any = null;
  @Output() moveToLogin = new EventEmitter<any>();
  forgotForm: FormGroup = new FormGroup({});
  submitted: boolean = false;
  password_visible: boolean = true;
  is_reset_password_email: boolean = true;

  ngOnInit(): void {
    this.initializeForgotForm();
  }

  initializeForgotForm() {
    this.forgotForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl(''),
    });
  }


  resetPassword() {
    if (this.forgotForm.invalid) {
      this.submitted = true
      return
    } else {
      this.submitted = false;
      this.is_reset_password_email = false
      console.log('Value:', this.forgotForm.value)
    }
  }

  validation_error: any[] = [];
  get strengthLevel(): 'Weak' | 'Medium' | 'Strong' {
    if (this.validation_error?.length === 3 || this.validation_error?.length === 4) return 'Weak';
    if (this.validation_error?.length === 1 || this.validation_error?.length === 2) return 'Medium';
    return 'Strong';
  }

  passwordCriteria() {
    this.validation_error = [];
    let password = this.forgotForm.controls['password'].value;
    if (password?.length < 12) {
      this.validation_error.push('Password must be at least 12 characters long');
    }
    if (!/[A-Z]/.test(password || '')) {
      this.validation_error.push('Password must contain at least one uppercase letter');
    }
    if (!/\d/.test(password || '')) {
      this.validation_error.push('Password must contain at least one numeric character');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password || '')) {
      this.validation_error.push('Password must contain at least one special character');
    }
    return this.validation_error;
  }

  moveLogin() {
    // Emit an event with the value 'true' to indicate moving to the login screen
    this.moveToLogin.emit(true);
  }
}
