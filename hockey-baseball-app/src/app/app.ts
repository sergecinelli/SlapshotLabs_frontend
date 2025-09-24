import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';

@Component({
  selector: 'app-root',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatCardModule,
    MatDivider
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('hockey-baseball-app');
  
  // Form fields
  email = '';
  password = '';
  rememberMe = false;
  
  onSubmit() {
    console.log('Sign in attempt:', {
      email: this.email,
      password: '***',
      rememberMe: this.rememberMe
    });
    
    // TODO: Implement actual authentication logic
    if (this.email && this.password) {
      alert('Sign in functionality would be implemented here!');
    } else {
      alert('Please fill in all required fields.');
    }
  }
}
